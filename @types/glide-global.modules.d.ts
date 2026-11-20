/**
 * Hand-written types for the global-scope Script Includes React Portal calls from its server
 * modules (`import { global } from '@servicenow/glide/global'`). The classes ship in the separate
 * global app packages/global-helpers; they may be missing on an instance, so callers feature-detect.
 */
declare module '@servicenow/glide/global' {
    interface ReactPortalGlobalMessages {
        info: string[];
        error: string[];
        warning: string[];
    }

    class ReactPortalGlobal {
        constructor();
        version(): string;
        drainSessionMessages(): ReactPortalGlobalMessages;
        getImpersonatingUserName(): string | null;
        getPreference(name: string): string | null;
        clearClientData(key: string): boolean;
        currentApplication(): { id: string; scope: string; name: string } | null;
    }

    export const global: {
        ReactPortalGlobal: typeof ReactPortalGlobal;
        [name: string]: any;
    };
}
