import '@servicenow/sdk/global';
import { List, Record, default_view } from '@servicenow/sdk/core';

/**
 * Related lists on the classic forms of every React Portal table: each parent record shows its
 * children (pages, menus, placements, items, source files, builds, dependencies, assets, entries)
 * and, for portals, pages and menu items, their user criteria (Available for / Not available for).
 *
 * One sys_ui_related_list per parent table (Default view) with one entry per list. Implicit lists
 * use 'child_table.reference_field'; dependency lists that need a dot-walk use a sys_relationship.
 * Each list has its own column layout (List with parent [+ relationship]), so the tables' own default
 * list layouts (instance records) stay untouched.
 * Generated from a table/reference matrix; Fluent files can't contain loops, so each record is explicit.
 */

/* ---- Relationships ---- */

export const componentImportsRel = Record({
    $id: Now.ID['rel-component-imports'],
    table: 'sys_relationship',
    data: {
        name: 'Imports',
        advanced: false,
        simple_reference: false,
        basic_apply_to: 'x_312987_portal_component',
        basic_query_from: 'x_312987_portal_build_dep',
        query_with: `(function refineQuery(current, parent) {
    current.addQuery('build.component', parent.getUniqueValue());
})(current, parent);`,
    },
});

export const componentImportedByRel = Record({
    $id: Now.ID['rel-component-imported-by'],
    table: 'sys_relationship',
    data: {
        name: 'Imported by',
        advanced: false,
        simple_reference: false,
        basic_apply_to: 'x_312987_portal_component',
        basic_query_from: 'x_312987_portal_build_dep',
        query_with: `(function refineQuery(current, parent) {
    current.addQuery('target_build.component', parent.getUniqueValue());
})(current, parent);`,
    },
});

export const buildImportedByRel = Record({
    $id: Now.ID['rel-build-imported-by'],
    table: 'sys_relationship',
    data: {
        name: 'Imported by',
        advanced: false,
        simple_reference: false,
        basic_apply_to: 'x_312987_portal_build',
        basic_query_from: 'x_312987_portal_build_dep',
        query_with: `(function refineQuery(current, parent) {
    current.addQuery('target_build', parent.getUniqueValue());
})(current, parent);`,
    },
});

/* ---- x_312987_portal_portal ---- */

export const portalRelatedLists = Record({
    $id: Now.ID['related-lists-portal'],
    table: 'sys_ui_related_list',
    data: { name: 'x_312987_portal_portal', view: 'Default view' },
});

Record({
    $id: Now.ID['related-list-portal-page-portal'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: portalRelatedLists, position: 0, related_list: 'x_312987_portal_page.portal' },
});

List({
    table: 'x_312987_portal_page',
    view: default_view,
    parent: 'x_312987_portal_portal',
    columns: ['name', 'route_pattern', 'title', 'layout_override', 'order', 'active'],
});

Record({
    $id: Now.ID['related-list-portal-menu-portal'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: portalRelatedLists, position: 1, related_list: 'x_312987_portal_menu.portal' },
});

List({
    table: 'x_312987_portal_menu',
    view: default_view,
    parent: 'x_312987_portal_portal',
    columns: ['key', 'name', 'active'],
});

// portal-wide placements only
Record({
    $id: Now.ID['related-list-portal-placement-portal'],
    table: 'sys_ui_related_list_entry',
    data: {
        list_id: portalRelatedLists,
        position: 2,
        related_list: 'x_312987_portal_placement.portal',
        filter: 'pageISEMPTY',
    },
});

List({
    table: 'x_312987_portal_placement',
    view: default_view,
    parent: 'x_312987_portal_portal',
    columns: ['region', 'component', 'parent', 'order', 'active'],
});

Record({
    $id: Now.ID['related-list-portal-release-portal'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: portalRelatedLists, position: 3, related_list: 'x_312987_portal_release.portal' },
});

List({
    table: 'x_312987_portal_release',
    view: default_view,
    parent: 'x_312987_portal_portal',
    columns: ['revision', 'processed_at', 'processed_by', 'host_abi'],
});

Record({
    $id: Now.ID['related-list-portal-uc'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: portalRelatedLists, position: 4, related_list: 'x_312987_portal_portal_uc.portal' },
});

List({
    table: 'x_312987_portal_portal_uc',
    view: default_view,
    parent: 'x_312987_portal_portal',
    columns: ['user_criteria'],
});

Record({
    $id: Now.ID['related-list-portal-uc-no'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: portalRelatedLists, position: 5, related_list: 'x_312987_portal_portal_uc_no.portal' },
});

List({
    table: 'x_312987_portal_portal_uc_no',
    view: default_view,
    parent: 'x_312987_portal_portal',
    columns: ['user_criteria'],
});

/* ---- x_312987_portal_page ---- */

export const pageRelatedLists = Record({
    $id: Now.ID['related-lists-page'],
    table: 'sys_ui_related_list',
    data: { name: 'x_312987_portal_page', view: 'Default view' },
});

Record({
    $id: Now.ID['related-list-page-placement-page'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: pageRelatedLists, position: 0, related_list: 'x_312987_portal_placement.page' },
});

List({
    table: 'x_312987_portal_placement',
    view: default_view,
    parent: 'x_312987_portal_page',
    columns: ['region', 'component', 'parent', 'order', 'active'],
});

Record({
    $id: Now.ID['related-list-page-menu-item-page'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: pageRelatedLists, position: 1, related_list: 'x_312987_portal_menu_item.page' },
});

List({
    table: 'x_312987_portal_menu_item',
    view: default_view,
    parent: 'x_312987_portal_page',
    columns: ['label', 'menu', 'type', 'active'],
});

Record({
    $id: Now.ID['related-list-page-uc'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: pageRelatedLists, position: 2, related_list: 'x_312987_portal_page_uc.page' },
});

List({
    table: 'x_312987_portal_page_uc',
    view: default_view,
    parent: 'x_312987_portal_page',
    columns: ['user_criteria'],
});

Record({
    $id: Now.ID['related-list-page-uc-no'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: pageRelatedLists, position: 3, related_list: 'x_312987_portal_page_uc_no.page' },
});

List({
    table: 'x_312987_portal_page_uc_no',
    view: default_view,
    parent: 'x_312987_portal_page',
    columns: ['user_criteria'],
});

/* ---- x_312987_portal_menu ---- */

export const menuRelatedLists = Record({
    $id: Now.ID['related-lists-menu'],
    table: 'sys_ui_related_list',
    data: { name: 'x_312987_portal_menu', view: 'Default view' },
});

Record({
    $id: Now.ID['related-list-menu-menu-item-menu'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: menuRelatedLists, position: 0, related_list: 'x_312987_portal_menu_item.menu' },
});

List({
    table: 'x_312987_portal_menu_item',
    view: default_view,
    parent: 'x_312987_portal_menu',
    columns: ['label', 'type', 'parent', 'page', 'order', 'active'],
});

/* ---- x_312987_portal_menu_item ---- */

export const menuItemRelatedLists = Record({
    $id: Now.ID['related-lists-menu-item'],
    table: 'sys_ui_related_list',
    data: { name: 'x_312987_portal_menu_item', view: 'Default view' },
});

// child items of a group
Record({
    $id: Now.ID['related-list-menu-item-menu-item-parent'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: menuItemRelatedLists, position: 0, related_list: 'x_312987_portal_menu_item.parent' },
});

List({
    table: 'x_312987_portal_menu_item',
    view: default_view,
    parent: 'x_312987_portal_menu_item',
    columns: ['label', 'type', 'page', 'order', 'active'],
});

Record({
    $id: Now.ID['related-list-item-uc'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: menuItemRelatedLists, position: 1, related_list: 'x_312987_portal_item_uc.menu_item' },
});

List({
    table: 'x_312987_portal_item_uc',
    view: default_view,
    parent: 'x_312987_portal_menu_item',
    columns: ['user_criteria'],
});

Record({
    $id: Now.ID['related-list-item-uc-no'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: menuItemRelatedLists, position: 2, related_list: 'x_312987_portal_item_uc_no.menu_item' },
});

List({
    table: 'x_312987_portal_item_uc_no',
    view: default_view,
    parent: 'x_312987_portal_menu_item',
    columns: ['user_criteria'],
});

/* ---- x_312987_portal_component ---- */

export const componentRelatedLists = Record({
    $id: Now.ID['related-lists-component'],
    table: 'sys_ui_related_list',
    data: { name: 'x_312987_portal_component', view: 'Default view' },
});

Record({
    $id: Now.ID['related-list-component-source-file-component'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: componentRelatedLists, position: 0, related_list: 'x_312987_portal_source_file.component' },
});

List({
    table: 'x_312987_portal_source_file',
    view: default_view,
    parent: 'x_312987_portal_component',
    columns: ['path', 'target', 'revision', 'byte_length'],
});

Record({
    $id: Now.ID['related-list-component-build-component'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: componentRelatedLists, position: 1, related_list: 'x_312987_portal_build.component' },
});

List({
    table: 'x_312987_portal_build',
    view: default_view,
    parent: 'x_312987_portal_component',
    columns: ['state', 'built_revision', 'needs_rebuild', 'compiler_version', 'completed_at'],
});

Record({
    $id: Now.ID['related-list-component-build-dep-component-imports'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: componentRelatedLists, position: 2, related_list: `REL:${componentImportsRel.$id}` },
});

List({
    table: 'x_312987_portal_build_dep',
    view: default_view,
    parent: 'x_312987_portal_component',
    relationship: componentImportsRel,
    columns: ['build', 'specifier', 'kind', 'target_build'],
});

Record({
    $id: Now.ID['related-list-component-build-dep-component-imported-by'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: componentRelatedLists, position: 3, related_list: `REL:${componentImportedByRel.$id}` },
});

List({
    table: 'x_312987_portal_build_dep',
    view: default_view,
    parent: 'x_312987_portal_component',
    relationship: componentImportedByRel,
    columns: ['build', 'specifier', 'kind'],
});

Record({
    $id: Now.ID['related-list-component-placement-component'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: componentRelatedLists, position: 4, related_list: 'x_312987_portal_placement.component' },
});

List({
    table: 'x_312987_portal_placement',
    view: default_view,
    parent: 'x_312987_portal_component',
    columns: ['portal', 'page', 'region', 'active'],
});

// pages using it as their layout
Record({
    $id: Now.ID['related-list-component-page-layout-override'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: componentRelatedLists, position: 5, related_list: 'x_312987_portal_page.layout_override' },
});

List({
    table: 'x_312987_portal_page',
    view: default_view,
    parent: 'x_312987_portal_component',
    columns: ['portal', 'name', 'route_pattern', 'active'],
});

// portals using it as their default layout
Record({
    $id: Now.ID['related-list-component-portal-default-layout'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: componentRelatedLists, position: 6, related_list: 'x_312987_portal_portal.default_layout' },
});

List({
    table: 'x_312987_portal_portal',
    view: default_view,
    parent: 'x_312987_portal_component',
    columns: ['name', 'slug', 'active'],
});

/* ---- x_312987_portal_theme ---- */

export const themeRelatedLists = Record({
    $id: Now.ID['related-lists-theme'],
    table: 'sys_ui_related_list',
    data: { name: 'x_312987_portal_theme', view: 'Default view' },
});

Record({
    $id: Now.ID['related-list-theme-portal-theme'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: themeRelatedLists, position: 0, related_list: 'x_312987_portal_portal.theme' },
});

List({
    table: 'x_312987_portal_portal',
    view: default_view,
    parent: 'x_312987_portal_theme',
    columns: ['name', 'slug', 'active'],
});

Record({
    $id: Now.ID['related-list-theme-source-file-theme'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: themeRelatedLists, position: 1, related_list: 'x_312987_portal_source_file.theme' },
});

List({
    table: 'x_312987_portal_source_file',
    view: default_view,
    parent: 'x_312987_portal_theme',
    columns: ['path', 'target', 'revision', 'byte_length'],
});

Record({
    $id: Now.ID['related-list-theme-build-theme'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: themeRelatedLists, position: 2, related_list: 'x_312987_portal_build.theme' },
});

List({
    table: 'x_312987_portal_build',
    view: default_view,
    parent: 'x_312987_portal_theme',
    columns: ['state', 'built_revision', 'needs_rebuild', 'compiler_version', 'completed_at'],
});

/* ---- x_312987_portal_build ---- */

export const buildRelatedLists = Record({
    $id: Now.ID['related-lists-build'],
    table: 'sys_ui_related_list',
    data: { name: 'x_312987_portal_build', view: 'Default view' },
});

Record({
    $id: Now.ID['related-list-build-build-asset-build'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: buildRelatedLists, position: 0, related_list: 'x_312987_portal_build_asset.build' },
});

List({
    table: 'x_312987_portal_build_asset',
    view: default_view,
    parent: 'x_312987_portal_build',
    columns: ['path', 'kind', 'mime_type', 'byte_length'],
});

Record({
    $id: Now.ID['related-list-build-build-dep-build'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: buildRelatedLists, position: 1, related_list: 'x_312987_portal_build_dep.build' },
});

List({
    table: 'x_312987_portal_build_dep',
    view: default_view,
    parent: 'x_312987_portal_build',
    columns: ['specifier', 'kind', 'target_build', 'host_export', 'package_version'],
});

Record({
    $id: Now.ID['related-list-build-build-dep-build-imported-by'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: buildRelatedLists, position: 2, related_list: `REL:${buildImportedByRel.$id}` },
});

List({
    table: 'x_312987_portal_build_dep',
    view: default_view,
    parent: 'x_312987_portal_build',
    relationship: buildImportedByRel,
    columns: ['build', 'specifier', 'kind'],
});

/* ---- x_312987_portal_release ---- */

export const releaseRelatedLists = Record({
    $id: Now.ID['related-lists-release'],
    table: 'sys_ui_related_list',
    data: { name: 'x_312987_portal_release', view: 'Default view' },
});

Record({
    $id: Now.ID['related-list-release-release-entry-release'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: releaseRelatedLists, position: 0, related_list: 'x_312987_portal_release_entry.release' },
});

List({
    table: 'x_312987_portal_release_entry',
    view: default_view,
    parent: 'x_312987_portal_release',
    columns: ['entry_type', 'stable_key', 'component', 'theme', 'placement', 'build', 'server_mode'],
});

/* ---- x_312987_portal_placement ---- */

export const placementRelatedLists = Record({
    $id: Now.ID['related-lists-placement'],
    table: 'sys_ui_related_list',
    data: { name: 'x_312987_portal_placement', view: 'Default view' },
});

// a block's child placements
Record({
    $id: Now.ID['related-list-placement-placement-parent'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: placementRelatedLists, position: 0, related_list: 'x_312987_portal_placement.parent' },
});

List({
    table: 'x_312987_portal_placement',
    view: default_view,
    parent: 'x_312987_portal_placement',
    columns: ['region', 'component', 'order', 'active'],
});

/* ---- x_312987_portal_doc_collection ---- */

export const docCollectionRelatedLists = Record({
    $id: Now.ID['related-lists-doc-collection'],
    table: 'sys_ui_related_list',
    data: { name: 'x_312987_portal_doc_collection', view: 'Default view' },
});

Record({
    $id: Now.ID['related-list-doc-collection-section'],
    table: 'sys_ui_related_list_entry',
    data: {
        list_id: docCollectionRelatedLists,
        position: 0,
        related_list: 'x_312987_portal_doc_section.collection',
    },
});

List({
    table: 'x_312987_portal_doc_section',
    view: default_view,
    parent: 'x_312987_portal_doc_collection',
    columns: ['order', 'title', 'slug', 'icon', 'active', 'origin'],
});

Record({
    $id: Now.ID['related-list-doc-collection-doc'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: docCollectionRelatedLists, position: 1, related_list: 'x_312987_portal_doc.collection' },
});

List({
    table: 'x_312987_portal_doc',
    view: default_view,
    parent: 'x_312987_portal_doc_collection',
    columns: ['path', 'title', 'doc_section', 'order', 'active', 'origin'],
});

/* ---- x_312987_portal_doc_section ---- */

export const docSectionRelatedLists = Record({
    $id: Now.ID['related-lists-doc-section'],
    table: 'sys_ui_related_list',
    data: { name: 'x_312987_portal_doc_section', view: 'Default view' },
});

Record({
    $id: Now.ID['related-list-doc-section-doc'],
    table: 'sys_ui_related_list_entry',
    data: { list_id: docSectionRelatedLists, position: 0, related_list: 'x_312987_portal_doc.doc_section' },
});

List({
    table: 'x_312987_portal_doc',
    view: default_view,
    parent: 'x_312987_portal_doc_section',
    columns: ['order', 'title', 'path', 'active', 'origin'],
});
