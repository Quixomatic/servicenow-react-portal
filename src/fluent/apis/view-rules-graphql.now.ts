import '@servicenow/sdk/global';
import { GraphQLApi, Acl } from '@servicenow/sdk/core';
import { resolveViewResolver, explainViewResolver } from '../../server/views/view-rules-api';

/**
 * Portal view rules over GraphQL: { x312987Portal { viewRules { resolve(…) { view source … } } } }.
 *
 * - resolve: any authenticated user (customers included). The form's fallback path; the one-request
 *   path is the remote table x_312987_portal_view_answer chained into uiView.
 * - explain: studio users only (null otherwise); Studio's test panel, optionally as another user.
 *
 * Roleless customers can call it: the internal-role gate is off (portals serve snc_external users on
 * instances with explicit roles) and the schema gate is the user_is_authenticated security attribute
 * (an empty ACL denies on this release).
 */
const viewRulesGate = Acl({
    $id: Now.ID['acl-gql-view-rules'],
    type: 'graphql',
    name: 'viewRules',
    operation: 'execute',
    securityAttribute: 'user_is_authenticated',
    description: 'React Portal: view rules GraphQL API (any authenticated user)',
});

GraphQLApi({
    $id: Now.ID['gql-view-rules'],
    name: 'React Portal view rules',
    namespace: 'viewRules',
    requiresAuthentication: true,
    requiresAclAuthorization: true,
    requiresSncInternalRole: false,
    enforceAcl: [viewRulesGate],
    schema: `
schema {
    query: Query
}

type Query {
    resolve(kind: String, table: String!, sysId: String, query: String, portal: String!, page: String, urlView: String, optionView: String, lockView: Boolean, remember: Boolean, remembered: String): ViewResolution
    explain(kind: String, table: String!, sysId: String, query: String, portal: String!, page: String, urlView: String, optionView: String, lockView: Boolean, remember: Boolean, remembered: String, user: String): ViewExplanation
}

type ViewResolution {
    view: String
    source: String
    ruleId: String
    ruleName: String
    missing: String
    reason: String
}

type RuleVerdict {
    ruleId: String
    name: String
    scope: String
    order: Int
    view: String
    matched: Boolean
    failedOn: String
    detail: String
}

type ViewExplanation {
    resolution: ViewResolution
    rulePortalId: String
    rulePortalName: String
    rulePortalShared: Boolean
    subjectUserId: String
    subjectViewAs: Boolean
    notes: [String]
    rules: [RuleVerdict]
}
`,
    resolvers: [
        {
            $id: Now.ID['gql-view-rules-resolve'],
            name: 'viewRulesResolve',
            paths: ['Query:resolve'],
            script: resolveViewResolver,
        },
        {
            $id: Now.ID['gql-view-rules-explain'],
            name: 'viewRulesExplain',
            paths: ['Query:explain'],
            script: explainViewResolver,
        },
    ],
});
