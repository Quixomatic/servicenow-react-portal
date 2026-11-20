---
title: View rules
description: Portal view rules — which form or list view a portal shows for a table, per page, condition and audience, resolved in the form's own request.
section: Concepts
order: 12
tags: [forms, lists, views, view-rules, security, user-criteria]
---

# View rules

View rules decide which **form view** or **list view** a portal shows for a table. They work like Workspace view rules, but they belong to a **portal** (and optionally one of its pages) instead of a workspace. They also add an audience: roles and user criteria.

A matching rule **forces** the view, as view rules do in ServiceNow. The URL `view` param, the widget option and the user's remembered view can't override it. The view switcher shows the view locked, and its tooltip names the rule.

The platform still builds everything for that view: layout, UI policies, client scripts, UI actions, field states and the scratchpad. React Portal only chooses the view name.

## Resolution order

For a form (the first step that applies wins):

1. **Page rules** of the current page, by order.
2. **Portal rules**, by order: this portal's, or another portal's (see [Sharing rules](#sharing-rules-between-portals)).
3. Only when no rule matched: the **URL** `view` param, then the **widget option** `view` (with `lockView`, the option comes first), then the user's **remembered view**. Each counts only when the view exists for the table; an unknown URL or option view shows a "View `x` not found" notice.
4. The **Workspace rules fallback**: the portal's `settings.viewRuleConfigId`, a `sys_ux_view_rules_configuration`.
5. The portal's **default views**: `settings.formViews`, e.g. `sp,ess`; the first that exists wins.
6. The **Default** view.

Lists follow the same order. A matching list rule forces the list view; otherwise the widget option, the route, then the URL view apply, as before.

## Rules

A rule (`x_312987_portal_view_rule`) has:

| Field | Meaning |
|---|---|
| Portal | The portal it belongs to |
| Page | Optional. A page rule applies on that page only and is evaluated before every portal rule, whatever its order |
| Table | The **exact** table. A `task` rule doesn't apply to `incident` (Workspace view rules behave the same; verified on the instance) |
| Applies to | Forms, Lists, or Forms and lists |
| Order | Lower first. The first matching rule wins |
| Condition | Forms only: an encoded query on the record. Empty = always. **Sys ID is -1** means "a new record", as in Workspace view rules |
| View | A `sys_ui_view` reference plus its name (what the platform receives). The name follows the reference when the view is renamed |
| Roles | Optional: any of these roles |
| Available for / Not available for | User criteria (`x_312987_portal_vrule_uc` / `_vrule_uc_no`), same semantics as portals, pages and menu items |
| Advanced + Script | Optional server script; return true to apply. Variables: `record` (GlideRecord, or null for lists), `table`, `kind`, `isNew`, `portal`, `page`, `user` |

A rule matches when it is active, applies to the kind, its table is the record's table, the user has one of its roles (if any), passes its user criteria, its condition matches and its script returns true. Its view must also exist for the table.

### Conditions and new records

- **Existing record:** the user's read access is checked first (`GlideRecordSecure`). An unreadable record never matches a rule. The condition then runs on the record as the system, like Workspace rule conditions, so the user's field ACLs don't change the outcome.
- **New record** (`sys_id=-1`): the condition runs on a new record with its defaults plus the form's preset query (`query`). A `sys_id=-1` term matches new records only; existing records never match it.
- Dynamic filters work, e.g. **Caller is (dynamic) Me** for "the user's own incidents".

## Sharing rules between portals

A portal can use **another portal's portal rules**: Studio ▸ View rules ▸ *View rules: Use X's rules* (`settings.viewRulesFrom`). Set up rules once and point the other portals at them. Page rules always belong to the current portal's own pages.

The Workspace rules fallback (`settings.viewRuleConfigId`) is a separate, optional setting.

## How it runs: one request

The form resolves its view **in its own GraphQL request**:

- The remote table `x_312987_portal_view_answer` returns one computed row: the resolved view, its source and the rule.
- The platform's nested-query mechanism (`_query` with `$$parent.<field>$$`) feeds that row into `GlideViewQuery_Query.uiView` in the same request: `uiView(views: "$$parent.views$$", viewRuleConfigId: "$$parent.rule_config$$")`.
- A resolved view travels as the only candidate, with no Workspace configuration, so nothing can override it. When nothing was resolved, the row sends the portal's default views and its Workspace configuration, and `uiView` applies its own resolution.
- The row never sends an empty value: an empty `$$parent` substitution becomes the string `"null"`, which `uiView` treats as a view name.

Measured on dev189813: a form with rules costs about +10 ms over a plain form, and a form with a URL view now takes one request instead of two (the old `checkFormViews` pre-request is gone).

**Fallback:** if the one-request path is unavailable (no answer row), the form switches to two calls for the rest of the page load: `x312987Portal.viewRules.resolve`, then the form.

## GraphQL API

`x312987Portal.viewRules` (scripted GraphQL in the app's namespace, at `/api/now/graphql`):

```graphql
query {
  x312987Portal { viewRules {
    resolve(kind: "form", table: "incident", sysId: "…", portal: "<portal sys_id>", page: "<page sys_id>", urlView: "ess") {
      view source ruleId ruleName missing reason
    }
  } }
}
```

- `resolve`: any authenticated user. `source` is `rule`, `url`, `option`, `remembered` or `auto`; `reason` is filled for Studio users only.
- `explain(…, user)`: Studio users only (null otherwise). Returns every candidate rule's verdict (`matched`, `failedOn`: kind, roles, criteria, condition, script or view), optionally for another user. Roles and user criteria are then evaluated for that user; record access is still checked as the caller.

Client helpers in `utilities:app/graphql`: `resolveViewRules`, `explainViewRules`, `useViewRuleResolution`, `useViewRuleExplain`, `useViewRulesContext`, `FORM_RULES_QUERY`, `viewAnswerConditions`.

## Security

- **Rule tables are Studio-only** (read: developer, designer, publisher; write: designer; scripts: developer). Customers never read rule rows; the resolver reads them server-side.
- **The answer table** is readable by any authenticated user. A row is only the caller's own resolution for a record they can read.
- **The GraphQL gate** is the `user_is_authenticated` security attribute, with the internal-role gate off. Portals serve roleless and `snc_external` users, and an empty ACL denies on this release.
- **Advanced scripts** run through `GlideScopedEvaluator` in the app scope. Errors skip the rule and are logged.
- **Rule details are not exposed:** customers get the view and the rule's name (the switcher's tooltip); rule ids and reasons go to Studio users only.

## Studio

**View rules** activity (the eye icon) for each portal:

- **Settings:** whose rules apply (this portal or another), the Workspace rules fallback and the default views.
- **Rules:** page rules and portal rules, with reorder, activate and Repair (a renamed view).
- **Editor:** name, table, forms/lists, view (the table's views), page, order, condition (the condition builder plus *New records only*), roles, user criteria, advanced script.
- **Test:** pick a record (or a new one with a preset query), a page, an optional URL view and a **View as user**. The panel shows the resulting view and every rule's verdict.

The designer's portal settings (Form views) show the same two settings and link to the activity. The editor is the record component `app/view-rules-editor`.

## Related

- [Forms](../primitives/forms.md#form-view-resolution)
- [Lists](../primitives/lists.md)
- [User criteria](user-criteria.md)
- [Portals](portals.md)
