import { authHeaders } from 'utilities:app/graphql';
import type { ClientScript, ClientScripts, UiAction, UiPolicy } from 'utilities:app/graphql';
import type { FormStore } from 'components:app/field';
import { createGlideRecordClass } from './glide-record';
import { createGlideAjaxClass } from './glide-ajax';
import { confirmDialog, alertDialog } from 'components:app/confirm-dialog';
import { showFieldsDialog } from 'components:app/field-dialog';
// Attachments (A6): g_form.enableAttachments / disableAttachments.
import { setFormAttachmentsEnabled } from 'utilities:app/attachments';

/**
 * The legacy client-script environment (a compatibility layer: only legacy client scripts, UI
 * policy scripts and UI action onclick scripts receive it; new widgets use the typed form API).
 *
 * Sandbox: like Workspace, every script is compiled with `new Function` in a scope where window,
 * document, jQuery, $, $j and angular are null; `this` is an empty object. Errors (compile, run,
 * and inside async callbacks) are caught, reported to onError / env.errors and never break the form.
 *
 * APIs in scope: g_form, g_user, g_scratchpad, GlideAjax, GlideRecord (async), getMessage,
 * getMessages, g_modal (alert / confirm / showFields), g_aw (openRecord), g_navigation, g_service_catalog,
 * g_i18n, gsftSubmit.
 */

export type ScriptUser = {
    sysId: string;
    userName: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    roles: string[];
};

export type ScriptError = { script: string; kind: string; message: string; at: number };

export type ScriptHost = {
    store: FormStore;
    /** Field name / alias → store name (catalog: variable names, IO:<sys_id>). */
    resolve?: (name: string) => string;
    table: () => string;
    sysId: () => string;
    isNew: () => boolean;
    view: () => string;
    encodedRecord: () => string;
    /** Is the field on the form (g_form.hasField)? Default: any field the store knows. */
    hasField?: (name: string) => boolean;
    /** The form's section names (g_form.getSectionNames); the first, untitled section answers to ''. */
    sectionNames?: () => string[];
    /** The form's related list names ('task_sla.task', 'REL:<sys_id>') for g_form.show/hideRelatedList (app/related-list wave). */
    relatedListNames?: () => string[];
    /** Record display value (header title). */
    displayValue?: () => string;
    /** g_form.submit / save: run a UI action by name or sys_id (default: Save). False = blocked. */
    submit?: (actionName?: string) => Promise<unknown> | false;
    openRecord?: (table: string, sysId: string, params?: Record<string, unknown>) => void;
    openCatalogItem?: (table: string, sysId: string, params?: Record<string, unknown>) => void;
    navigate?: (url: string, target?: string) => void;
};

export type ScriptEnvironmentOptions = {
    host: ScriptHost;
    scripts?: ClientScripts;
    scratchpad?: Record<string, unknown>;
    user: ScriptUser;
    onError?: (e: ScriptError) => void;
    /** Catalog form (g_form names are variable names). */
    catalog?: boolean;
    /** g_service_catalog extras: `parent` = the item form an MRVS row belongs to (see catalogParent). */
    serviceCatalog?: ServiceCatalogOptions;
};

/** g_service_catalog.parent: read (and write) the parent catalog form from an MRVS row's scripts. */
export type CatalogParent = {
    getValue: (name: string) => string;
    getDisplayValue?: (name: string) => string;
    setValue?: (name: string, value: string, displayValue?: string) => void;
    hasField?: (name: string) => boolean;
};

export type ServiceCatalogOptions = {
    parent?: CatalogParent;
    isOrderGuide?: () => boolean;
};

/**
 * g_service_catalog.parent over any form store (names resolved like the parent's g_form: variable
 * name, IO:<sys_id>, sys_id). Workspace gives rows getValue; Service Portal also setValue.
 */
export function catalogParent(store: FormStore, resolve: (name: string) => string = (n) => n): CatalogParent {
    const known = (n: string) => {
        const s = store.getState();
        const name = resolve(n);
        return name in s.fields || name in s.meta;
    };
    return {
        getValue: (n: string) => (n && known(n) ? store.getValue(resolve(n)) : ''),
        getDisplayValue: (n: string) => (n && known(n) ? store.getDisplayValue(resolve(n)) : ''),
        setValue: (n: string, value: string, displayValue?: string) => {
            if (n && known(n))
                store.setValue(resolve(n), str(value), displayValue === undefined ? undefined : str(displayValue));
        },
        hasField: (n: string) => !!n && known(n),
    };
}

export type ScriptEnvironment = {
    g_form: any;
    g_user: any;
    g_scratchpad: Record<string, unknown>;
    errors: ScriptError[];
    /** onLoad scripts, then every onChange script with isLoading = true. */
    runOnLoad: () => void;
    /** Bind onChange scripts to committed value changes; returns the unbind. */
    attachOnChange: () => () => void;
    /** onSubmit scripts: false when one of them returned false. */
    runOnSubmit: (actionName?: string) => boolean;
    /** A UI policy's run-scripts (execute if true / execute if false). */
    runPolicyScript: (policy: UiPolicy, result: boolean) => void;
    /** A UI action's onclick script (client part). */
    runClientAction: (action: UiAction) => Promise<unknown>;
    /** Name of the UI action running now (g_form.getActionName). */
    currentAction: () => string;
};

const SHADOWED = ['window', 'document', 'jQuery', '$', '$j', 'angular'];
const API_NAMES = [
    'g_form',
    'g_user',
    'g_scratchpad',
    'GlideAjax',
    'GlideRecord',
    'getMessage',
    'getMessages',
    'g_modal',
    'g_aw',
    'g_navigation',
    'g_service_catalog',
    'g_i18n',
    // List scripts (list UI actions, declarative list client scripts): the g_list shim.
    'g_list',
    'gsftSubmit',
    'NOW',
];

const compiled = new Map<string, (api: Record<string, unknown>) => Record<string, any>>();

/** Compile a script once (cached by text + exports): returns its top-level functions. */
export function compileScript(
    script: string,
    exportsList: string[]
): (api: Record<string, unknown>) => Record<string, any> {
    const key = exportsList.join(',') + '\u0000' + script;
    const hit = compiled.get(key);
    if (hit) return hit;
    const params = API_NAMES.concat(SHADOWED);
    const body = `${script}\n;return {${exportsList.map((e) => `${e}: typeof ${e} === 'function' ? ${e} : undefined`).join(', ')}};`;
    // eslint-disable-next-line no-new-func
    const fn = new Function(...params, body);
    const run = (api: Record<string, unknown>) =>
        fn.apply(
            {},
            params.map((p) => (p in api ? api[p] : null))
        );
    compiled.set(key, run);
    return run;
}

/** g_user for client scripts (forms and lists): name, roles, hasRole & co. */
export function createGUser(user: ScriptUser): any {
    const fullName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ');
    const roles = (user.roles || []).map(String);
    const g_user: any = {
        userID: user.sysId,
        userName: user.userName,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        fullName,
        roles,
        getFullName: () => fullName,
        hasRole: (r: string) => roles.indexOf('admin') >= 0 || roles.indexOf(String(r)) >= 0,
        hasRoleExactly: (r: string) => roles.indexOf(String(r)) >= 0,
        hasRoles: () => roles.length > 0,
        hasRoleFromList: (list: string) =>
            roles.indexOf('admin') >= 0 ||
            String(list || '')
                .split(',')
                .some((r) => roles.indexOf(r.trim()) >= 0),
        getClientData: () => '',
    };
    return g_user;
}

/** g_modal on our dialogs (alert / confirm / showFields / showFrame); `wrap` guards script callbacks. */
export function createGModal(wrap: <F extends (...a: any[]) => any>(fn: F) => F = (fn) => fn): any {
    // g_modal on our dialogs (app/confirm-dialog, app/field-dialog). Messages may carry HTML (Workspace
    // passes rich text): sanitised by the dialog's text rendering, i.e. shown as text here.
    const textOf = (v: unknown) =>
        String(v == null ? '' : v)
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    const g_modal: any = {
        alert: (title: string, message?: string, callback?: () => void) =>
            alertDialog({ title: textOf(title), description: message ? textOf(message) : undefined }).then(() => {
                if (typeof callback === 'function') wrap(callback)();
            }),
        // confirm(title, message, callback?, options?): callback(confirmed); the promise resolves true on
        // confirm and, on cancel, resolves false when a callback is given, else rejects (Workspace).
        confirm: (
            title: string,
            message?: string,
            callback?: (ok: boolean) => void,
            options?: { confirmTitle?: string; cancelTitle?: string; confirmType?: string }
        ) =>
            confirmDialog({
                title: textOf(title),
                description: message ? textOf(message) : undefined,
                confirmLabel: options && options.confirmTitle ? textOf(options.confirmTitle) : undefined,
                cancelLabel: options && options.cancelTitle ? textOf(options.cancelTitle) : undefined,
                destructive: !!(options && options.confirmType === 'destructive'),
            }).then((ok) => {
                if (typeof callback === 'function') {
                    wrap(callback)(ok);
                    return ok;
                }
                if (!ok) throw false;
                return true;
            }),
        // showFields({ title, fields, instruction?, confirmTitle?, cancelTitle?, size? }) → { updatedFields } / rejects on cancel.
        showFields: (spec: { title?: string; fields?: unknown[]; [k: string]: unknown }) =>
            showFieldsDialog({
                ...(spec as any),
                fields: Array.isArray(spec && spec.fields) ? (spec.fields as any[]) : [],
            }),
        showFrame: (opts: { url?: string }) => {
            if (opts && opts.url) window.open(opts.url, '_blank', 'noopener');
            return Promise.resolve();
        },
    };
    return g_modal;
}

function str(v: unknown): string {
    if (v == null) return '';
    if (Array.isArray(v)) return v.join(',');
    return String(v);
}

export function createScriptEnvironment(options: ScriptEnvironmentOptions): ScriptEnvironment {
    const { host, user } = options;
    const store = host.store;
    const resolve = host.resolve || ((n: string) => n);
    const scripts: ClientScripts = options.scripts || { onLoad: [], onChange: [], onSubmit: [], messages: {} };
    const messages = scripts.messages || {};
    const scratchpad: Record<string, unknown> = options.scratchpad ? { ...options.scratchpad } : {};
    const errors: ScriptError[] = [];
    let action = '';
    let depth = 0;

    const report = (scriptName: string, kind: string, e: unknown) => {
        const err: ScriptError = {
            script: scriptName,
            kind,
            message: String((e && (e as Error).message) || e),
            at: Date.now(),
        };
        errors.push(err);
        // eslint-disable-next-line no-console
        console.error(`[client script] ${kind} "${scriptName}": ${err.message}`, e);
        if (options.onError) options.onError(err);
    };
    let currentScript = '';
    /** Callbacks scripts hand to async APIs run guarded too (errors reported, form unaffected). */
    const wrap = <F extends (...a: any[]) => any>(fn: F): F => {
        const owner = currentScript || 'callback';
        return ((...args: any[]) => {
            try {
                return fn(...args);
            } catch (e) {
                report(owner, 'callback', e);
                return undefined;
            }
        }) as unknown as F;
    };

    const GlideRecord = createGlideRecordClass({ wrap });
    const GlideAjax = createGlideAjaxClass({ wrap });
    const getMessage = (key: string) => (key in messages ? messages[key] : String(key));
    const getMessages = (keys: string[], cb?: (m: Record<string, string>) => void) => {
        const out: Record<string, string> = {};
        (keys || []).forEach((k) => (out[k] = getMessage(k)));
        if (typeof cb === 'function') wrap(cb)(out);
        return out;
    };

    // ---- field state helpers -------------------------------------------------------------
    const state = () => store.getState();
    // g_form.hasField: on the form (the view's elements), not merely a column of the table.
    const has = (n: string) => {
        const name = resolve(n);
        if (host.hasField) return host.hasField(name);
        return name in state().fields || name in state().meta;
    };
    const metaOf = (n: string) => state().meta[resolve(n)];
    const entryOf = (n: string) => state().fields[resolve(n)];
    const layered = (n: string) => {
        const e = entryOf(n);
        const ov = (e && e.overrides) || {};
        const p = (e && e.policy) || {};
        const s = state().server[resolve(n)] || {};
        const m = metaOf(n);
        const readOnly = !!(ov.readOnly ?? p.readOnly ?? s.readonly ?? (m && (m.readOnly || m.canWrite === false)));
        const mandatory = !!(ov.mandatory ?? p.mandatory ?? s.mandatory ?? (m && m.mandatory));
        const visible = !!(ov.visible ?? p.visible ?? !s.hidden) && !(m && m.canRead === false);
        return { readOnly, mandatory: mandatory && !readOnly, visible, label: ov.label || (m && m.label) || n };
    };
    const choicesOf = (n: string) => {
        const e = entryOf(n);
        if (e && e.overrides && e.overrides.choices) return e.overrides.choices;
        const m = metaOf(n);
        return ((m && m.choices) || []).map((c: any) => ({ value: c.value, label: c.label }));
    };

    /** Display value for a set value: choice label, else (references) fetched from the platform. */
    const resolveDisplay = (name: string, value: string) => {
        const m = state().meta[name];
        if (!m || !value) return;
        const ref = m.reference && m.reference.table;
        if (!ref || (m.type !== 'reference' && m.type !== 'glide_list')) return;
        const ids = m.type === 'glide_list' ? value.split(',') : [value];
        Promise.all(
            ids.map((id) =>
                fetch(
                    `/api/now/ui/glideRecord/${encodeURIComponent(ref)}/${encodeURIComponent(id)}?sysparm_display_value=all&sysparm_fields=sys_id`,
                    { credentials: 'same-origin', headers: authHeaders(false) }
                )
                    .then((r) => (r.ok ? r.json() : null))
                    .then((j) => (j && j.result && j.result.display_value) || id)
                    .catch(() => id)
            )
        ).then((labels) => {
            if (store.getValue(name) === value) store.setValue(name, value, labels.join(', '));
        });
    };

    // ---- g_form ----------------------------------------------------------------------------
    const g_form: any = {
        getValue: (n: string) => (has(n) ? store.getValue(resolve(n)) : ''),
        getDisplayValue: (n?: string) =>
            n ? store.getDisplayValue(resolve(n)) : host.displayValue ? host.displayValue() : '',
        getIntValue: (n: string) => parseInt(g_form.getValue(n), 10) || 0,
        getDecimalValue: (n: string) => parseFloat(String(g_form.getValue(n)).replace(/,/g, '')) || 0,
        getBooleanValue: (n: string) => {
            const v = String(g_form.getValue(n)).toLowerCase();
            return v === 'true' || v === '1' || v === 'yes';
        },
        setValue: (n: string, value: unknown, displayValue?: unknown) => {
            const name = resolve(n);
            const v = str(value);
            let dv = displayValue === undefined ? undefined : str(displayValue);
            if (dv === undefined) {
                const choice = choicesOf(name).find((c: any) => c.value === v);
                if (choice) dv = choice.label;
            }
            store.setValue(name, v, dv === undefined ? v : dv);
            if (dv === undefined) resolveDisplay(name, v);
        },
        clearValue: (n: string) => store.clearValue(resolve(n)),
        hasField: (n: string) => has(n),
        getFieldNames: () => Object.keys(state().meta),
        getEditableFields: () => Object.keys(state().meta).filter((n) => !layered(n).readOnly),
        setMandatory: (n: string, on: unknown) => store.setMandatory(resolve(n), !!on),
        isMandatory: (n: string) => layered(n).mandatory,
        setReadOnly: (n: string, on: unknown) => store.setReadOnly(resolve(n), !!on),
        setReadonly: (n: string, on: unknown) => store.setReadOnly(resolve(n), !!on),
        setDisabled: (n: string, on: unknown) => store.setReadOnly(resolve(n), !!on),
        isReadOnly: (n: string) => layered(n).readOnly,
        isDisabled: (n: string) => layered(n).readOnly,
        setDisplay: (n: string, on: unknown) => store.setVisible(resolve(n), !!on),
        setVisible: (n: string, on: unknown) => store.setVisible(resolve(n), !!on),
        isVisible: (n: string) => layered(n).visible,
        setLabel: (n: string, label: string) => store.setLabel(resolve(n), str(label)),
        setLabelOf: (n: string, label: string) => store.setLabel(resolve(n), str(label)),
        getLabel: (n: string) => layered(n).label,
        getLabelOf: (n: string) => layered(n).label,
        setFieldPlaceholder: (n: string, text: string) => store.setPlaceholder(resolve(n), str(text)),
        showFieldMsg: (n: string, msg: string, type?: string) => {
            const kind = type === 'error' || type === 'warning' || type === 'success' ? type : 'info';
            store.showFieldMessage(resolve(n), str(msg), kind as any);
        },
        hideFieldMsg: (n: string, clearAll?: boolean) => {
            const name = resolve(n);
            if (clearAll) return store.hideFieldMessage(name);
            const e = entryOf(name);
            if (e && e.messages.length) store.hideFieldMessage(name, e.messages[0].kind);
        },
        hideAllFieldMsgs: () =>
            Object.keys(state().fields).forEach((n) => state().fields[n].messages.length && store.hideFieldMessage(n)),
        showErrorBox: (n: string, msg: string) => store.showFieldMessage(resolve(n), str(msg), 'error'),
        hideErrorBox: (n: string) => store.hideFieldMessage(resolve(n), 'error'),
        addInfoMessage: (msg: string) => store.addInfoMessage(str(msg)),
        addErrorMessage: (msg: string) => store.addErrorMessage(str(msg)),
        addWarningMessage: (msg: string) => store.addInfoMessage(str(msg)),
        addFormMessage: (msg: string, type?: string) =>
            type === 'error' ? store.addErrorMessage(str(msg)) : store.addInfoMessage(str(msg)),
        clearMessages: () => store.clearMessages(),
        flash: () => {},
        // options (choice overlay)
        addOption: (n: string, value: unknown, label?: unknown, index?: number) => {
            const name = resolve(n);
            const list = choicesOf(name).filter((c: any) => c.value !== str(value));
            const item = { value: str(value), label: label === undefined ? str(value) : str(label) };
            if (typeof index === 'number' && index >= 0 && index <= list.length) list.splice(index, 0, item);
            else list.push(item);
            store.setOptions(name, list);
        },
        removeOption: (n: string, value: unknown) => {
            const name = resolve(n);
            store.setOptions(
                name,
                choicesOf(name).filter((c: any) => c.value !== str(value))
            );
        },
        clearOptions: (n: string) => store.setOptions(resolve(n), []),
        getOption: (n: string, value: unknown) => {
            const c = choicesOf(n).find((x: any) => x.value === str(value));
            return c ? { value: c.value, text: c.label, label: c.label } : null;
        },
        // references
        getReference: (n: string, callback?: (gr: any) => void) => {
            const name = resolve(n);
            const m = state().meta[name];
            const value = store.getValue(name);
            const table = m && m.reference && m.reference.table;
            if (typeof callback !== 'function') {
                // eslint-disable-next-line no-console
                console.warn('(g_form) getReference needs a callback: synchronous lookups are not supported');
                return undefined;
            }
            const gr = new GlideRecord(table || '');
            if (!table || !value) {
                wrap(callback)(gr);
                return undefined;
            }
            gr.get(value, callback);
            return undefined;
        },
        getDisplayBox: (n: string) => ({ value: store.getDisplayValue(resolve(n)) }),
        // record
        isNewRecord: () => host.isNew(),
        getUniqueValue: () => host.sysId(),
        getTableName: () => host.table(),
        getViewName: () => host.view() || 'default',
        getActionName: () => action,
        getEncodedRecord: () => host.encodedRecord(),
        getSysId: () => host.sysId(),
        isDirty: () => store.isDirty(),
        modified: false,
        serialize: (onlyDirty?: boolean) => {
            const s = state();
            return Object.keys(s.fields)
                .filter(
                    (n) => s.fields[n].value !== '' && (!onlyDirty || s.fields[n].value !== s.fields[n].originalValue)
                )
                .map((n) => ({
                    name: n,
                    value: s.fields[n].value,
                    displayValue: s.fields[n].displayValue,
                    originalValue: s.fields[n].originalValue,
                }));
        },
        save: () => (host.submit ? host.submit() : false),
        submit: (actionName?: string) => (host.submit ? host.submit(actionName || action || undefined) : false),
        // no-ops: sections, related lists, attachments, decorations (not rendered yet)
        // Sections: names as the platform uses them (the section caption, lower case; '' or the table
        // name for the first, untitled section). A hidden section disappears in stacked and tab modes.
        setSectionDisplay: (name: string, on: unknown) => {
            const key = String(name || '').toLowerCase();
            const names = host.sectionNames ? host.sectionNames() : [];
            const target = key === String(host.table()).toLowerCase() && names.indexOf(key) < 0 ? '' : key;
            if (host.sectionNames && names.indexOf(target) < 0) {
                // eslint-disable-next-line no-console
                console.warn(
                    `(g_form) setSectionDisplay: no section "${name}" on this form (${names.map((n) => n || "''").join(', ')})`
                );
                return false;
            }
            store.setSectionDisplay(target, !!on);
            return true;
        },
        getSectionNames: () => (host.sectionNames ? host.sectionNames() : []),
        isSectionVisible: (name: string) => store.getSectionDisplay(String(name || '').toLowerCase()) !== false,
        // Related lists (app/related-list wave): display flags on the store (keys 'rl:<name>', 'rl:*'),
        // read by RecordForm's related lists through isRelatedListShown.
        showRelatedList: (name: string) =>
            setRelatedListDisplay(store, name, true, host.relatedListNames ? host.relatedListNames() : undefined),
        hideRelatedList: (name: string) =>
            setRelatedListDisplay(store, name, false, host.relatedListNames ? host.relatedListNames() : undefined),
        showRelatedLists: () =>
            setAllRelatedListsDisplay(store, true, host.relatedListNames ? host.relatedListNames() : []),
        hideRelatedLists: () =>
            setAllRelatedListsDisplay(store, false, host.relatedListNames ? host.relatedListNames() : []),
        getRelatedListNames: () => (host.relatedListNames ? host.relatedListNames() : []),
        // Attachments (A6): form-level flag beside the store (utilities:app/attachments), read by
        // app/attachment-panel; disable = no new files (existing ones stay listed), as on the platform.
        enableAttachments: () => setFormAttachmentsEnabled(store, true),
        disableAttachments: () => setFormAttachmentsEnabled(store, false),
        // Decorations next to the field label: (field, icon, title, color?) — 'icon-star' etc. map to Lucide icons.
        addDecoration: (n: string, icon: string, title: string, color?: string) =>
            store.addDecoration(resolve(n), str(icon), str(title), color ? str(color) : undefined),
        removeDecoration: (n: string, icon?: string, title?: string) =>
            store.removeDecoration(
                resolve(n),
                icon === undefined ? undefined : str(icon),
                title === undefined ? undefined : str(title)
            ),
        isLiveUpdating: () => false,
        getControl: () => null,
        getElement: () => null,
        getFormElement: () => null,
    };

    const g_user: any = createGUser(user);
    const g_modal: any = createGModal(wrap);
    const openRecord = (table: string, sysId: string, params?: Record<string, unknown>) => {
        if (host.openRecord) host.openRecord(table, sysId, params);
        else window.open(`/${encodeURIComponent(table)}.do?sys_id=${encodeURIComponent(sysId)}`, '_blank', 'noopener');
    };
    const api: Record<string, unknown> = {
        g_form,
        g_user,
        g_scratchpad: scratchpad,
        GlideAjax,
        GlideRecord,
        getMessage,
        getMessages,
        g_modal,
        g_aw: { openRecord, closeRecord: () => {}, setTabLabel: () => {} },
        g_navigation: {
            open: (url: string, target?: string) =>
                host.navigate ? host.navigate(url, target) : window.open(url, target || '_self'),
            openRecord: openRecord,
        },
        g_service_catalog: {
            // MRVS row scripts: the item form the row belongs to (undefined elsewhere, as on the platform).
            parent: options.serviceCatalog && options.serviceCatalog.parent,
            isOrderGuide: () =>
                !!(
                    options.serviceCatalog &&
                    options.serviceCatalog.isOrderGuide &&
                    options.serviceCatalog.isOrderGuide()
                ),
            openCatalogItem: (table: string, sysId: string, params?: Record<string, unknown>) => {
                if (host.openCatalogItem) host.openCatalogItem(table, sysId, params);
                // eslint-disable-next-line no-console
                else console.warn('(g_service_catalog) openCatalogItem is not available here');
            },
        },
        g_i18n: {
            getMessage,
            getMessages,
            format: (s: string, ...a: unknown[]) => String(s).replace(/\{(\d+)\}/g, (_, i) => str(a[Number(i)])),
        },
        gsftSubmit: (_control: unknown, _form: unknown, actionName?: string) => g_form.submit(actionName),
        NOW: undefined,
    };

    const run = <T>(s: { name: string }, kind: string, fn: () => T): T | undefined => {
        const prev = currentScript;
        currentScript = s.name;
        try {
            return fn();
        } catch (e) {
            report(s.name, kind, e);
            return undefined;
        } finally {
            currentScript = prev;
        }
    };
    const fnOf = (s: ClientScript | { name: string; script: string }, exportName: string, kind: string) =>
        run(
            s,
            `${kind} (compile)`,
            () => compileScript(s.script, [exportName])(api)[exportName] as ((...a: any[]) => any) | undefined
        );

    const onChangeFor = (name: string) => scripts.onChange.filter((s) => s.fieldName && resolve(s.fieldName) === name);

    const env: ScriptEnvironment = {
        g_form,
        g_user,
        g_scratchpad: scratchpad,
        errors,
        runOnLoad() {
            for (const s of scripts.onLoad) {
                const f = fnOf(s, 'onLoad', 'onLoad');
                if (f) run(s, 'onLoad', () => f());
            }
            for (const s of scripts.onChange) {
                const name = resolve(s.fieldName);
                if (!name) continue;
                const f = fnOf(s, 'onChange', 'onChange');
                const v = store.getValue(name);
                if (f) run(s, 'onChange', () => f(null, v, v, true, false));
            }
        },
        attachOnChange() {
            return store.onChange('*', (name, value, oldValue) => {
                const list = onChangeFor(name);
                if (!list.length) return;
                if (depth > 10)
                    return report(
                        list[0].name,
                        'onChange',
                        new Error('onChange recursion stopped (more than 10 nested changes)')
                    );
                depth++;
                try {
                    for (const s of list) {
                        const f = fnOf(s, 'onChange', 'onChange');
                        if (f) run(s, 'onChange', () => f(null, oldValue, value, false, false));
                    }
                } finally {
                    depth--;
                }
            });
        },
        runOnSubmit(actionName) {
            const prev = action;
            if (actionName) action = actionName;
            try {
                for (const s of scripts.onSubmit) {
                    const f = fnOf(s, 'onSubmit', 'onSubmit');
                    if (!f) continue;
                    const r = run(s, 'onSubmit', () => f());
                    if (r === false) return false;
                }
                return true;
            } finally {
                action = prev;
            }
        },
        runPolicyScript(policy, result) {
            if (!policy.runScripts) return;
            const script = result ? policy.scriptTrue : policy.reverse ? policy.scriptFalse : undefined;
            if (!script) return;
            const s = { name: `UI policy: ${policy.description || policy.id} (${result ? 'true' : 'false'})`, script };
            const f = fnOf(s, 'onCondition', 'policy');
            if (f) run(s, 'policy', () => f());
        },
        runClientAction(uiAction) {
            const s = { name: `UI action: ${uiAction.label || uiAction.name}`, script: uiAction.clientScript || '' };
            const prev = action;
            action = uiAction.name || uiAction.sysId;
            try {
                const f = fnOf(s, 'onClick', 'onClick');
                if (!f) return Promise.resolve(undefined);
                const r = run(s, 'onClick', () => f(g_form));
                return Promise.resolve(r);
            } finally {
                // getActionName stays valid while the onclick script runs (incl. its g_form.submit).
                action = prev;
            }
        },
        currentAction: () => action,
    };
    return env;
}

// ---- related lists (app/related-list wave) ------------------------------------------------------
// g_form.showRelatedList / hideRelatedList(s) keep display flags on the form store, next to the
// section flags: 'rl:<name>' per list and 'rl:*' for all (the store lower-cases keys). A list shows
// unless its own flag, else the all-lists flag, is false. Names match as the classic form does:
// the list name ('task_sla.task'), its table ('task_sla'), or a relationship's 'REL:<sys_id>' / bare sys_id.

/** The form's related list names that `name` designates (the name itself when the form's lists are unknown). */
export function matchRelatedLists(name: string, names?: string[]): string[] {
    const key = String(name || '')
        .trim()
        .toLowerCase();
    if (!key) return [];
    if (!names) return [key];
    return names.filter((n) => {
        const l = String(n).toLowerCase();
        return l === key || l.split('.')[0] === key || l === 'rel:' + key;
    });
}

export function setRelatedListDisplay(store: FormStore, name: string, on: boolean, names?: string[]): boolean {
    const matched = matchRelatedLists(name, names);
    // A list that isn't on this view is ignored silently, as on the classic form (platform scripts
    // hide relationship lists on every task form).
    if (!matched.length) return false;
    matched.forEach((n) => store.setSectionDisplay('rl:' + n.toLowerCase(), !!on));
    return true;
}

export function setAllRelatedListsDisplay(store: FormStore, on: boolean, names: string[]): void {
    store.setSectionDisplay('rl:*', !!on);
    // Per-list flags set earlier would otherwise win over the all-lists call.
    names.forEach((n) => store.setSectionDisplay('rl:' + String(n).toLowerCase(), !!on));
}

/** Is the related list displayed (not hidden by g_form.hideRelatedList / hideRelatedLists)? */
export function isRelatedListShown(store: Pick<FormStore, 'getSectionDisplay'>, name: string): boolean {
    const own = store.getSectionDisplay('rl:' + String(name || '').toLowerCase());
    if (own !== undefined) return own !== false;
    return store.getSectionDisplay('rl:*') !== false;
}
