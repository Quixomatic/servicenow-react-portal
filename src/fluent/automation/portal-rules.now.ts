import '@servicenow/sdk/global';
import { BusinessRule } from '@servicenow/sdk/core';
import { normalizePortal, enforceSingleDefault } from '../../server/automation/portal-rules';
import { normalizeTheme } from '../../server/automation/theme-rules';
import { normalizeComponent } from '../../server/automation/component-rules';
import { validatePage, validatePlacement } from '../../server/automation/page-rules';
import { compileInstanceStyle } from '../../server/automation/instance-style-rules';

/* Portal */

BusinessRule({
    $id: Now.ID['br-portal-normalize'],
    name: 'RP: Normalize portal',
    description: 'Slug format, JSON fields, layout kind, home page ownership; guards active-release changes.',
    table: 'x_312987_portal_portal',
    when: 'before',
    action: ['insert', 'update'],
    order: 100,
    script: normalizePortal,
});

BusinessRule({
    $id: Now.ID['br-portal-single-default'],
    name: 'RP: Single default portal',
    description: 'Only one portal can be the default.',
    table: 'x_312987_portal_portal',
    when: 'after',
    action: ['insert', 'update'],
    filterCondition: 'is_default=true^is_defaultVALCHANGES',
    order: 100,
    script: enforceSingleDefault,
});

/* Theme */

BusinessRule({
    $id: Now.ID['br-theme-normalize'],
    name: 'RP: Normalize theme',
    description: 'Key, tokens shape; advances source_revision when tokens or stylesheet change.',
    table: 'x_312987_portal_theme',
    when: 'before',
    action: ['insert', 'update'],
    order: 100,
    script: normalizeTheme,
});

/* Component */

BusinessRule({
    $id: Now.ID['br-component-normalize'],
    name: 'RP: Normalize component definition',
    description:
        'Namespace/key → unique_id, kind, server mode, JSON fields, layout regions; advances source_revision on build-relevant changes.',
    table: 'x_312987_portal_component',
    when: 'before',
    action: ['insert', 'update'],
    order: 100,
    script: normalizeComponent,
});

/* Page and placement */

BusinessRule({
    $id: Now.ID['br-page-validate'],
    name: 'RP: Validate page',
    description: 'Route pattern format and uniqueness per portal, layout override kind, access JSON.',
    table: 'x_312987_portal_page',
    when: 'before',
    action: ['insert', 'update'],
    order: 100,
    script: validatePage,
});

BusinessRule({
    $id: Now.ID['br-placement-validate'],
    name: 'RP: Validate placement',
    description: 'One owner, region exists on the effective layout, placeable widget, parent in same owner, no cycles.',
    table: 'x_312987_portal_placement',
    when: 'before',
    action: ['insert', 'update'],
    order: 100,
    script: validatePlacement,
});

BusinessRule({
    $id: Now.ID['br-placement-instance-style'],
    name: 'RP: Compile placement instance CSS',
    description:
        'Compiles classes, style tokens, grid layout and responsive block options into instance_css, then reprocesses the portal.',
    table: 'x_312987_portal_placement',
    when: 'after',
    action: ['insert', 'update'],
    order: 900,
    script: compileInstanceStyle,
});
