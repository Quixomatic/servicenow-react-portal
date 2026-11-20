/**
 * utilities:app/gform: the legacy client-script compatibility layer (g_form & co.).
 *
 * Only legacy scripts receive it (client scripts, UI policy run-scripts, UI action onclick
 * scripts). New widgets use the typed form API (components:app/field, components:app/form).
 *
 *   startScriptEnvironment({ host, scripts, scratchpad, user, policies, onError })
 *       → { env, stop }   binds onChange scripts, runs onLoad (then onChange with isLoading),
 *                         hooks UI policy run-scripts; stop() unbinds
 *   useClientScripts({ … })   the same as a React hook (re-runs when `runKey` changes)
 *   createScriptEnvironment(options)   the environment alone (g_form, g_user, runOnSubmit, …)
 *   createGForm(store, { table, sysId, user })   g_form & co. on ANY form store (no scripts run)
 *   attachGForm(store, { …, scripts, policies }) the same plus the script lifecycle → { env, stop }
 *   hostFor(store, options)                      the ScriptHost for a store
 *   catalogParent(store, resolve?)               g_service_catalog.parent over a store (MRVS rows → item form)
 *   compileScript(script, exports)     the sandbox (window, document, jQuery, $, $j, angular = null)
 *   createGlideAjaxClass / createGlideRecordClass
 *   createGList(target)                g_list (Workspace's list API) over any list (GListTarget: table,
 *                                      query(), selectedIds(), totalRows(), setFilter?, sort?, refresh?)
 *   createListScriptEnvironment({ list, user, onError?, openRecord? })
 *       → { g_list, g_user, run(name, script, fnName = 'onClick') }   list UI action / declarative list scripts
 *   createGUser(user) / createGModal(wrap?)   the g_user and g_modal objects alone
 */
import { useEffect, useRef, useState } from 'react';
import { useUser } from '@portal/runtime';
import type { ClientScripts } from 'utilities:app/graphql';
import type { AttachedPolicies, FormStore } from 'components:app/field';
import { createScriptEnvironment } from './environment';
import type { ScriptEnvironment, ScriptError, ScriptHost, ScriptUser, ServiceCatalogOptions } from './environment';

export { createScriptEnvironment, compileScript, catalogParent } from './environment';
// Related-list display flags (g_form.show/hideRelatedList), app/related-list wave.
export { isRelatedListShown, matchRelatedLists, setRelatedListDisplay, setAllRelatedListsDisplay } from './environment';
export type {
    ScriptEnvironment,
    ScriptEnvironmentOptions,
    ScriptError,
    ScriptHost,
    ScriptUser,
    CatalogParent,
    ServiceCatalogOptions,
} from './environment';
// g_user / g_modal builders (shared by the form and list environments).
export { createGUser, createGModal } from './environment';
// g_list (actions wave): the list scripting API over any list, and the list script environment.
export { createGList, createListScriptEnvironment } from './list-environment';
export type { GListTarget, ListScriptEnvironment } from './list-environment';
export { createGlideAjaxClass } from './glide-ajax';
export { createGlideRecordClass } from './glide-record';

export type StartOptions = {
    host: ScriptHost;
    scripts?: ClientScripts;
    scratchpad?: Record<string, unknown>;
    user: ScriptUser;
    /** The form's attached UI policies: their run-scripts execute through this environment. */
    policies?: AttachedPolicies;
    onError?: (e: ScriptError) => void;
    catalog?: boolean;
    /** g_service_catalog extras (MRVS rows: `parent`). */
    serviceCatalog?: ServiceCatalogOptions;
};

/** Start the legacy environment on a loaded form store. */
export function startScriptEnvironment(options: StartOptions): { env: ScriptEnvironment; stop: () => void } {
    const env = createScriptEnvironment(options);
    const offChange = env.attachOnChange();
    env.runOnLoad();
    // Classic order: onLoad client scripts, then UI policies (their scripts replay for the current results).
    if (options.policies) options.policies.setOnResult((p, r) => env.runPolicyScript(p, r), true);
    return {
        env,
        stop: () => {
            offChange();
            if (options.policies) options.policies.setOnResult(undefined);
        },
    };
}

export type GFormOptions = {
    table?: string;
    sysId?: string;
    isNew?: boolean;
    view?: string;
    user: ScriptUser;
    /** Field name / alias → store name. */
    resolve?: (name: string) => string;
    /** g_form.submit / save handler (default: not available). */
    submit?: ScriptHost['submit'];
    openRecord?: ScriptHost['openRecord'];
    hasField?: ScriptHost['hasField'];
    sectionNames?: ScriptHost['sectionNames'];
    relatedListNames?: ScriptHost['relatedListNames'];
    /** Catalog form (names are variable names) and its g_service_catalog extras (MRVS rows: parent). */
    catalog?: boolean;
    serviceCatalog?: ServiceCatalogOptions;
};

/** A host for any form store (not only RecordForm): table / sys_id / view from the options. */
export function hostFor(store: FormStore, o: GFormOptions): ScriptHost {
    return {
        store,
        resolve: o.resolve,
        table: () => o.table || store.table || '',
        sysId: () => o.sysId || store.sysId || '-1',
        isNew: () => (o.isNew !== undefined ? o.isNew : !(o.sysId || store.sysId) || (o.sysId || store.sysId) === '-1'),
        view: () => o.view || '',
        encodedRecord: () => store.encodedRecord || '',
        submit: o.submit,
        openRecord: o.openRecord,
        hasField: o.hasField,
        sectionNames: o.sectionNames,
        relatedListNames: o.relatedListNames,
    };
}

/**
 * The legacy g_form / g_user / GlideAjax / g_modal environment on ANY form store (a widget's own
 * createFormStore / useForm, a catalog form, a field dialog…), without starting scripts:
 *   const env = createGForm(store, { table: 'incident', sysId, user: scriptUserFrom(useUser()) })
 *   env.g_form.setValue('state', '2'); env.runClientAction(action)
 */
export function createGForm(
    store: FormStore,
    options: GFormOptions & {
        scripts?: ClientScripts;
        scratchpad?: Record<string, unknown>;
        onError?: (e: ScriptError) => void;
    }
): ScriptEnvironment {
    return createScriptEnvironment({
        host: hostFor(store, options),
        user: options.user,
        scripts: options.scripts,
        scratchpad: options.scratchpad,
        onError: options.onError,
        catalog: options.catalog,
        serviceCatalog: options.serviceCatalog,
    });
}

/** createGForm + the script lifecycle (onLoad, onChange, policy run-scripts); returns { env, stop }. */
export function attachGForm(
    store: FormStore,
    options: GFormOptions & {
        scripts?: ClientScripts;
        scratchpad?: Record<string, unknown>;
        policies?: AttachedPolicies;
        onError?: (e: ScriptError) => void;
    }
): { env: ScriptEnvironment; stop: () => void } {
    return startScriptEnvironment({
        host: hostFor(store, options),
        user: options.user,
        scripts: options.scripts,
        scratchpad: options.scratchpad,
        policies: options.policies,
        onError: options.onError,
        catalog: options.catalog,
        serviceCatalog: options.serviceCatalog,
    });
}

/** Map the runtime user (useUser) to g_user's source. */
export function scriptUserFrom(u: any): ScriptUser {
    return {
        sysId: (u && (u.sysId || u.userID)) || '',
        userName: (u && u.userName) || '',
        firstName: (u && u.firstName) || '',
        lastName: (u && u.lastName) || '',
        name: (u && u.name) || '',
        roles: (u && Array.isArray(u.roles) ? u.roles : []) as string[],
    };
}

/**
 * Hook form: starts when `enabled`, restarts when `runKey` changes, stops on unmount. Returns the
 * environment (for onSubmit and UI actions) and the script errors seen so far.
 */
export function useClientScripts(options: Omit<StartOptions, 'user'> & { enabled?: boolean; runKey?: unknown }) {
    const user = useUser() as any;
    const [state, setState] = useState<{ env: ScriptEnvironment | null; errors: ScriptError[] }>({
        env: null,
        errors: [],
    });
    const optsRef = useRef(options);
    optsRef.current = options;
    const ready = options.enabled !== false && !!user && !!(user.sysId || user.userName);
    useEffect(() => {
        if (!ready) return;
        const o = optsRef.current;
        const errors: ScriptError[] = [];
        let live = true;
        const started = startScriptEnvironment({
            ...o,
            user: scriptUserFrom(user),
            onError: (e) => {
                errors.push(e);
                if (live) setState((s) => ({ env: s.env, errors: errors.slice() }));
                if (o.onError) o.onError(e);
            },
        });
        setState({ env: started.env, errors: errors.slice() });
        return () => {
            live = false;
            started.stop();
        };
    }, [ready, options.runKey]);
    return state;
}
