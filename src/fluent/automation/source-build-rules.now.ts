import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'
import { validateSourceFile, trackSourceChange } from '../../server/automation/source-file-rules'
import { normalizeBuild, inheritBuildScope, normalizeRelease, inheritReleaseScope } from '../../server/automation/build-rules'

/* Extra source files */

BusinessRule({
    $id: Now.ID['br-source-validate'],
    name: 'RP: Validate source file',
    description: 'Exactly one owner, safe relative path (main.tsx/styles.css/server.js/theme.css are reserved), unique per owner, size limit, hash and per-file revision.',
    table: 'x_312987_portal_source_file',
    when: 'before',
    action: ['insert', 'update'],
    order: 100,
    script: validateSourceFile,
})

BusinessRule({
    $id: Now.ID['br-source-track'],
    name: 'RP: Track source changes',
    description: "Advances the owner's source_revision.",
    table: 'x_312987_portal_source_file',
    when: 'after',
    action: ['insert', 'update', 'delete'],
    order: 100,
    script: trackSourceChange,
})

/* Generated records: one current record per piece, in the source record's scope */

BusinessRule({
    $id: Now.ID['br-build-normalize'],
    name: 'RP: Normalize build',
    description: "Exactly one owner, one build per owner, owner's application scope.",
    table: 'x_312987_portal_build',
    when: 'before',
    action: ['insert', 'update'],
    order: 100,
    script: normalizeBuild,
})

BusinessRule({
    $id: Now.ID['br-build-asset-scope'],
    name: 'RP: Build asset scope',
    description: "Build assets live in their build's application scope.",
    table: 'x_312987_portal_build_asset',
    when: 'before',
    action: ['insert'],
    order: 100,
    script: inheritBuildScope,
})

BusinessRule({
    $id: Now.ID['br-build-dep-scope'],
    name: 'RP: Build dependency scope',
    description: "Build dependencies live in their build's application scope.",
    table: 'x_312987_portal_build_dep',
    when: 'before',
    action: ['insert'],
    order: 100,
    script: inheritBuildScope,
})

BusinessRule({
    $id: Now.ID['br-release-normalize'],
    name: 'RP: Normalize release',
    description: "One release per portal, in the portal's application scope.",
    table: 'x_312987_portal_release',
    when: 'before',
    action: ['insert'],
    order: 100,
    script: normalizeRelease,
})

BusinessRule({
    $id: Now.ID['br-release-entry-scope'],
    name: 'RP: Release entry scope',
    description: "Release entries live in their release's application scope.",
    table: 'x_312987_portal_release_entry',
    when: 'before',
    action: ['insert'],
    order: 100,
    script: inheritReleaseScope,
})
