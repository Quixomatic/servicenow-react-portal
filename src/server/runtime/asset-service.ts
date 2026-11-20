import { gs } from '@servicenow/glide';
import { GR, getById, findOne, each, str, bool } from '../lib/gr.ts';
import { T } from '../lib/tables.ts';
import { notFound, rpError } from '../lib/errors.ts';
import { isUsableBuild } from '../registry/registry.ts';
import { canAccessPortal, hasStudioCapability } from '../security/access.ts';

/**
 * RPAssetService: delivers compiled build assets (JS/CSS) with correct MIME types and
 * immutable cache headers. Builds are immutable once ready, so a build-scoped URL never
 * changes content.
 *
 * Who may fetch:
 * - studio users: any asset of any compiled build (including source maps);
 * - consumers: js/css of a build that is part of the release of a portal they can access
 *   (or of any active component/theme before its portal is first processed).
 *   Source maps are never served to consumers.
 * The URL carries ?v=<content hash>, so overwriting a build changes the URL.
 */

export interface AssetResponse {
    content: string;
    mimeType: string;
    hash: string;
    cacheControl: string;
}

export function getAsset(buildId: string, path: string): AssetResponse {
    if (!gs.isLoggedIn()) throw rpError(401, 'unauthenticated', 'Login required');
    const build = getById(T.build, buildId);
    if (!build || !isUsableBuild(build)) throw notFound('Asset not found');
    const asset = findOne(T.buildAsset, `build=${buildId}^path=${path}`);
    if (!asset) throw notFound('Asset not found');

    const kind = str(asset, 'kind');
    const studio = hasStudioCapability('any');
    if (!studio) {
        if (kind !== 'js' && kind !== 'css') throw notFound('Asset not found');
        if (!consumerMayFetch(build)) throw notFound('Asset not found');
    }

    return {
        content: str(asset, 'content'),
        mimeType: str(asset, 'mime_type') || (kind === 'css' ? 'text/css' : 'text/javascript'),
        hash: str(asset, 'hash'),
        cacheControl: 'private, max-age=31536000, immutable',
    };
}

function consumerMayFetch(build: GR): boolean {
    const buildId = build.getUniqueValue();

    // Part of the compiled release of a portal the user can access.
    let allowed = false;
    each(T.releaseEntry, `build=${buildId}`, (entry) => {
        if (allowed) return;
        const release = getById(T.release, str(entry, 'release'));
        const portal = release ? getById(T.portal, str(release, 'portal')) : null;
        if (portal && canAccessPortal(portal)) allowed = true;
    });
    if (allowed) return true;

    // Portal not processed yet: the build of any active component or theme.
    const owner = getById(T.component, str(build, 'component')) || getById(T.theme, str(build, 'theme'));
    return !!owner && bool(owner, 'active');
}
