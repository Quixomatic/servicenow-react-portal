import '@servicenow/sdk/global';
import { Record } from '@servicenow/sdk/core';

/**
 * The shipped record header defaults as data (x_312987_portal_record_field): all-portal rows
 * (portals empty), installed as demo data so an instance can edit or deactivate them. A slot with no
 * rows falls back to the built-in choices in code (whose ribbons still repeat the status fields).
 *
 * - task: title number, subtitle short_description, pills state and priority (incident, problem…);
 * - pills per table where the status fields differ (RITM stage, request state, approval, risk…);
 * - ribbons per table (the old SUMMARY_DEFAULTS), minus the fields the pills already show.
 * Generated (Fluent files can't contain loops); orders step by 100.
 */

/* ---- task: title ---- */

Record({
    $id: Now.ID['rf-task-title-number'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'task',
        slot: 'title',
        field: 'number',
        order: 100,
        active: true,
    },
});

/* ---- task: subtitle ---- */

Record({
    $id: Now.ID['rf-task-subtitle-short-description'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'task',
        slot: 'subtitle',
        field: 'short_description',
        order: 100,
        active: true,
    },
});

/* ---- task: pill ---- */

Record({
    $id: Now.ID['rf-task-pill-state'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'task',
        slot: 'pill',
        field: 'state',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-task-pill-priority'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'task',
        slot: 'pill',
        field: 'priority',
        order: 200,
        active: true,
    },
});

/* ---- sc_req_item: pill ---- */

Record({
    $id: Now.ID['rf-sc-req-item-pill-state'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_req_item',
        slot: 'pill',
        field: 'state',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-sc-req-item-pill-stage'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_req_item',
        slot: 'pill',
        field: 'stage',
        order: 200,
        active: true,
    },
});

/* ---- sc_request: pill ---- */

Record({
    $id: Now.ID['rf-sc-request-pill-request-state'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_request',
        slot: 'pill',
        field: 'request_state',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-sc-request-pill-approval'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_request',
        slot: 'pill',
        field: 'approval',
        order: 200,
        active: true,
    },
});

/* ---- sc_task: pill ---- */

Record({
    $id: Now.ID['rf-sc-task-pill-state'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_task',
        slot: 'pill',
        field: 'state',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-sc-task-pill-approval'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_task',
        slot: 'pill',
        field: 'approval',
        order: 200,
        active: true,
    },
});

/* ---- change_request: pill ---- */

Record({
    $id: Now.ID['rf-change-request-pill-state'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'change_request',
        slot: 'pill',
        field: 'state',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-change-request-pill-approval'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'change_request',
        slot: 'pill',
        field: 'approval',
        order: 200,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-change-request-pill-risk'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'change_request',
        slot: 'pill',
        field: 'risk',
        order: 300,
        active: true,
    },
});

/* ---- change_task: pill ---- */

Record({
    $id: Now.ID['rf-change-task-pill-state'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'change_task',
        slot: 'pill',
        field: 'state',
        order: 100,
        active: true,
    },
});

/* ---- kb_knowledge: pill ---- */

Record({
    $id: Now.ID['rf-kb-knowledge-pill-workflow-state'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'kb_knowledge',
        slot: 'pill',
        field: 'workflow_state',
        order: 100,
        active: true,
    },
});

/* ---- incident: ribbon ---- */

Record({
    $id: Now.ID['rf-incident-ribbon-caller-id'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'incident',
        slot: 'ribbon',
        field: 'caller_id',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-incident-ribbon-assigned-to'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'incident',
        slot: 'ribbon',
        field: 'assigned_to',
        order: 200,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-incident-ribbon-sys-updated-on'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'incident',
        slot: 'ribbon',
        field: 'sys_updated_on',
        order: 300,
        active: true,
    },
});

/* ---- sc_req_item: ribbon ---- */

Record({
    $id: Now.ID['rf-sc-req-item-ribbon-requested-for'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_req_item',
        slot: 'ribbon',
        field: 'requested_for',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-sc-req-item-ribbon-cat-item'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_req_item',
        slot: 'ribbon',
        field: 'cat_item',
        order: 200,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-sc-req-item-ribbon-due-date'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_req_item',
        slot: 'ribbon',
        field: 'due_date',
        order: 300,
        active: true,
    },
});

/* ---- sc_request: ribbon ---- */

Record({
    $id: Now.ID['rf-sc-request-ribbon-requested-for'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_request',
        slot: 'ribbon',
        field: 'requested_for',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-sc-request-ribbon-price'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_request',
        slot: 'ribbon',
        field: 'price',
        order: 200,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-sc-request-ribbon-due-date'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_request',
        slot: 'ribbon',
        field: 'due_date',
        order: 300,
        active: true,
    },
});

/* ---- sc_task: ribbon ---- */

Record({
    $id: Now.ID['rf-sc-task-ribbon-request-item'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_task',
        slot: 'ribbon',
        field: 'request_item',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-sc-task-ribbon-assigned-to'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_task',
        slot: 'ribbon',
        field: 'assigned_to',
        order: 200,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-sc-task-ribbon-due-date'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sc_task',
        slot: 'ribbon',
        field: 'due_date',
        order: 300,
        active: true,
    },
});

/* ---- problem: ribbon ---- */

Record({
    $id: Now.ID['rf-problem-ribbon-assigned-to'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'problem',
        slot: 'ribbon',
        field: 'assigned_to',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-problem-ribbon-sys-updated-on'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'problem',
        slot: 'ribbon',
        field: 'sys_updated_on',
        order: 200,
        active: true,
    },
});

/* ---- change_request: ribbon ---- */

Record({
    $id: Now.ID['rf-change-request-ribbon-type'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'change_request',
        slot: 'ribbon',
        field: 'type',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-change-request-ribbon-start-date'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'change_request',
        slot: 'ribbon',
        field: 'start_date',
        order: 200,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-change-request-ribbon-assigned-to'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'change_request',
        slot: 'ribbon',
        field: 'assigned_to',
        order: 300,
        active: true,
    },
});

/* ---- change_task: ribbon ---- */

Record({
    $id: Now.ID['rf-change-task-ribbon-change-request'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'change_task',
        slot: 'ribbon',
        field: 'change_request',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-change-task-ribbon-assigned-to'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'change_task',
        slot: 'ribbon',
        field: 'assigned_to',
        order: 200,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-change-task-ribbon-planned-end-date'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'change_task',
        slot: 'ribbon',
        field: 'planned_end_date',
        order: 300,
        active: true,
    },
});

/* ---- kb_knowledge: ribbon ---- */

Record({
    $id: Now.ID['rf-kb-knowledge-ribbon-kb-knowledge-base'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'kb_knowledge',
        slot: 'ribbon',
        field: 'kb_knowledge_base',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-kb-knowledge-ribbon-author'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'kb_knowledge',
        slot: 'ribbon',
        field: 'author',
        order: 200,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-kb-knowledge-ribbon-sys-updated-on'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'kb_knowledge',
        slot: 'ribbon',
        field: 'sys_updated_on',
        order: 300,
        active: true,
    },
});

/* ---- sys_user_group: ribbon ---- */

Record({
    $id: Now.ID['rf-sys-user-group-ribbon-manager'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sys_user_group',
        slot: 'ribbon',
        field: 'manager',
        order: 100,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-sys-user-group-ribbon-email'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sys_user_group',
        slot: 'ribbon',
        field: 'email',
        order: 200,
        active: true,
    },
});

Record({
    $id: Now.ID['rf-sys-user-group-ribbon-type'],
    $meta: { installMethod: 'demo' },
    table: 'x_312987_portal_record_field',
    data: {
        table: 'sys_user_group',
        slot: 'ribbon',
        field: 'type',
        order: 300,
        active: true,
    },
});
