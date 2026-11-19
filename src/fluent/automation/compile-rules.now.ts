import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'
import { compileComponentOnSave, compileThemeOnSave, compileOnSourceChange } from '../../server/automation/compile-rules'

/**
 * Compile on save (server-side compiler: Sucrase + linker + Tailwind v4, no WebAssembly).
 * Order 500: after the normalize/track rules have advanced source_revision, before the
 * reprocess rules (1000).
 */

BusinessRule({
    $id: Now.ID['br-compile-component'],
    name: 'RP: Compile component on save',
    description: 'Compiles client script, CSS and extra files into the component build (index.js + index.css).',
    table: 'x_312987_portal_component',
    when: 'after',
    action: ['insert', 'update'],
    order: 500,
    script: compileComponentOnSave,
})

BusinessRule({
    $id: Now.ID['br-compile-theme'],
    name: 'RP: Compile theme on save',
    description: 'Writes the theme build (theme.css) when the stylesheet or tokens change.',
    table: 'x_312987_portal_theme',
    when: 'after',
    action: ['insert', 'update'],
    order: 500,
    script: compileThemeOnSave,
})

BusinessRule({
    $id: Now.ID['br-compile-source'],
    name: 'RP: Compile owner on source file change',
    description: "Recompiles the file's component or theme when an extra file is added, changed or deleted.",
    table: 'x_312987_portal_source_file',
    when: 'after',
    action: ['insert', 'update', 'delete'],
    order: 500,
    script: compileOnSourceChange,
})
