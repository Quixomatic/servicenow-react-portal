import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'
import { syncRuleView } from '../../server/views/view-rules-api'

/* View rules: the view reference and the view name stay in agreement (the reference wins). */

BusinessRule({
    $id: Now.ID['br-view-rule-sync-view'],
    name: 'RP: Sync view rule view',
    description: 'View rules: View (sys_ui_view reference) and View name agree; the reference wins and survives a view rename, a name alone looks up the reference.',
    table: 'x_312987_portal_view_rule',
    when: 'before',
    action: ['insert', 'update'],
    order: 100,
    script: syncRuleView,
})
