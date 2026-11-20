import '@servicenow/sdk/global';
import { BusinessRule } from '@servicenow/sdk/core';
import {
    validateMenu,
    validateMenuItem,
    reprocessMenuPortal,
    reprocessMenuItemPortal,
} from '../../server/automation/menu-rules';
import { checkMenuItemScripts } from '../../server/automation/menu-script-rules';

/* Menus: validation before, release reprocessing after (menus are part of the portal manifest). */

BusinessRule({
    $id: Now.ID['br-menu-validate'],
    name: 'RP: Validate menu',
    description: 'Portal, key slug and uniqueness per portal, name; page-item menus cannot change portal.',
    table: 'x_312987_portal_menu',
    when: 'before',
    action: ['insert', 'update'],
    order: 100,
    script: validateMenu,
});

BusinessRule({
    $id: Now.ID['br-menu-item-validate'],
    name: 'RP: Validate menu item',
    description:
        'Parent is a group of the same menu (no cycles, bounded depth), per-type required fields, page of the same portal, route/URL format, lucide icon name.',
    table: 'x_312987_portal_menu_item',
    when: 'before',
    action: ['insert', 'update'],
    order: 100,
    script: validateMenuItem,
});

BusinessRule({
    $id: Now.ID['br-menu-item-scripts'],
    name: 'RP: Syntax-check menu item scripts',
    description:
        'Parses condition, badge_script and script (Sucrase) when they change; a malformed script is rejected with its line and column.',
    table: 'x_312987_portal_menu_item',
    when: 'before',
    action: ['insert', 'update'],
    filterCondition: 'conditionVALCHANGES^ORbadge_scriptVALCHANGES^ORscriptVALCHANGES',
    order: 110,
    script: checkMenuItemScripts,
});

BusinessRule({
    $id: Now.ID['br-reprocess-menu'],
    name: 'RP: Reprocess release (menu)',
    table: 'x_312987_portal_menu',
    when: 'after',
    action: ['insert', 'update', 'delete'],
    order: 1000,
    script: reprocessMenuPortal,
});

BusinessRule({
    $id: Now.ID['br-reprocess-menu-item'],
    name: 'RP: Reprocess release (menu item)',
    table: 'x_312987_portal_menu_item',
    when: 'after',
    action: ['insert', 'update', 'delete'],
    order: 1000,
    script: reprocessMenuItemPortal,
});
