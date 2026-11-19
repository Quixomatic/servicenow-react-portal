import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'
import {
    reprocessPortal,
    reprocessOwningPortal,
    reprocessThemePortals,
    reprocessComponentPortals,
} from '../../server/automation/reprocess-rules'

/**
 * Keep each portal's compiled release in sync with its inputs. (Successful compiles reprocess
 * from the build service.) processPortal writes only when the manifest actually changed.
 */

BusinessRule({
    $id: Now.ID['br-reprocess-portal'],
    name: 'RP: Reprocess release (portal)',
    table: 'x_312987_portal_portal',
    when: 'after',
    action: ['insert', 'update'],
    order: 1000,
    script: reprocessPortal,
})

BusinessRule({
    $id: Now.ID['br-reprocess-page'],
    name: 'RP: Reprocess release (page)',
    table: 'x_312987_portal_page',
    when: 'after',
    action: ['insert', 'update', 'delete'],
    order: 1000,
    script: reprocessOwningPortal,
})

BusinessRule({
    $id: Now.ID['br-reprocess-placement'],
    name: 'RP: Reprocess release (placement)',
    table: 'x_312987_portal_placement',
    when: 'after',
    action: ['insert', 'update', 'delete'],
    order: 1000,
    script: reprocessOwningPortal,
})

BusinessRule({
    $id: Now.ID['br-reprocess-theme'],
    name: 'RP: Reprocess release (theme)',
    table: 'x_312987_portal_theme',
    when: 'after',
    action: ['update', 'delete'],
    order: 1000,
    script: reprocessThemePortals,
})

BusinessRule({
    $id: Now.ID['br-reprocess-component'],
    name: 'RP: Reprocess release (component)',
    description: 'Name, kind, active, server mode, regions and default options feed the manifest; client code reaches it via compiles.',
    table: 'x_312987_portal_component',
    when: 'after',
    action: ['update', 'delete'],
    filterCondition: 'nameVALCHANGES^ORkindVALCHANGES^ORactiveVALCHANGES^ORserver_modeVALCHANGES^ORregions_jsonVALCHANGES^ORdefault_options_jsonVALCHANGES^ORplaceableVALCHANGES',
    order: 1000,
    script: reprocessComponentPortals,
})
