// Editor group layout: a tree of splits and groups (VS Code's grid), as plain immutable data.
//   group: { type: 'group', id, tabs: [{ path, preview }], active }
//   split: { type: 'split', id, dir: 'row' | 'column', children: [node] }
// `row` puts children side by side (split right), `column` stacks them (split down).

let seq = 0;
export const newId = (prefix) => `${prefix}${Date.now().toString(36)}${(seq += 1)}`;

export function group(tabs, active) {
    return {
        type: 'group',
        id: newId('g'),
        tabs: tabs || [],
        active: active || (tabs && tabs[0] ? tabs[0].path : null),
    };
}

export function groups(node, out) {
    const list = out || [];
    if (!node) return list;
    if (node.type === 'group') list.push(node);
    else node.children.forEach((child) => groups(child, list));
    return list;
}

export function findGroup(node, groupId) {
    return groups(node).find((g) => g.id === groupId) || null;
}

/** Replace the group `groupId` by fn(group) (fn may return null to remove it). */
function mapNode(node, groupId, fn) {
    if (node.type === 'group') return node.id === groupId ? fn(node) : node;
    let changed = false;
    const children = [];
    node.children.forEach((child) => {
        const next = mapNode(child, groupId, fn);
        if (next !== child) changed = true;
        if (next) children.push(next);
    });
    if (!changed) return node;
    return normalize({ ...node, children });
}

/** Collapse empty splits and single-child splits; merge nested splits of the same direction. */
function normalize(node) {
    if (!node || node.type === 'group') return node;
    let children = [];
    node.children.forEach((child) => {
        const c = normalize(child);
        if (!c) return;
        if (c.type === 'split' && c.dir === node.dir) children = children.concat(c.children);
        else children.push(c);
    });
    if (children.length === 0) return null;
    if (children.length === 1) return children[0];
    return { ...node, children };
}

export function updateGroup(tree, groupId, fn) {
    return mapNode(tree, groupId, fn) || group();
}

/** Remove a group; the tree always keeps at least one (empty) group. */
export function removeGroup(tree, groupId) {
    if (groups(tree).length <= 1) return tree;
    return mapNode(tree, groupId, () => null) || group();
}

/**
 * Put `newGroup` beside `targetId` on `edge` ('left' | 'right' | 'top' | 'bottom'). If the
 * target's parent already splits in that direction, the new group becomes its sibling.
 */
export function splitAt(tree, targetId, edge, newGroup) {
    const dir = edge === 'left' || edge === 'right' ? 'row' : 'column';
    const before = edge === 'left' || edge === 'top';
    function visit(node) {
        if (node.type === 'group') {
            if (node.id !== targetId) return node;
            return { type: 'split', id: newId('s'), dir, children: before ? [newGroup, node] : [node, newGroup] };
        }
        const index = node.children.findIndex((c) => c.type === 'group' && c.id === targetId);
        if (index !== -1 && node.dir === dir) {
            const children = node.children.slice();
            children.splice(before ? index : index + 1, 0, newGroup);
            return { ...node, children };
        }
        const children = node.children.map(visit);
        return children.some((c, i) => c !== node.children[i]) ? { ...node, children } : node;
    }
    return normalize(visit(tree));
}

// ---- tabs -----------------------------------------------------------------------------------

/** Open `path` in a group. A preview tab replaces the group's existing preview tab. */
export function openTab(g, path, preview, isDirty) {
    const existing = g.tabs.find((t) => t.path === path);
    if (existing) {
        const tabs =
            !preview && existing.preview ? g.tabs.map((t) => (t.path === path ? { ...t, preview: false } : t)) : g.tabs;
        return { ...g, tabs, active: path };
    }
    const tab = { path, preview: !!preview };
    const previewIndex = preview ? g.tabs.findIndex((t) => t.preview && !(isDirty && isDirty(t.path))) : -1;
    let tabs;
    if (previewIndex !== -1) {
        tabs = g.tabs.slice();
        tabs[previewIndex] = tab;
    } else {
        const activeIndex = g.tabs.findIndex((t) => t.path === g.active);
        tabs = g.tabs.slice();
        tabs.splice(activeIndex === -1 ? tabs.length : activeIndex + 1, 0, tab);
    }
    return { ...g, tabs, active: path };
}

export function pinTab(g, path) {
    if (!g.tabs.some((t) => t.path === path && t.preview)) return g;
    return { ...g, tabs: g.tabs.map((t) => (t.path === path ? { ...t, preview: false } : t)) };
}

export function closeTab(g, path) {
    const index = g.tabs.findIndex((t) => t.path === path);
    if (index === -1) return g;
    const tabs = g.tabs.filter((t) => t.path !== path);
    let active = g.active;
    if (active === path) active = tabs.length ? tabs[Math.min(index, tabs.length - 1)].path : null;
    return { ...g, tabs, active };
}

export function insertTab(g, tab, index) {
    const without = g.tabs.filter((t) => t.path !== tab.path);
    const at = index === undefined || index < 0 || index > without.length ? without.length : index;
    const tabs = without.slice();
    tabs.splice(at, 0, tab);
    return { ...g, tabs, active: tab.path };
}

/** Rename a path everywhere in the tree (file or folder rename). */
export function renamePaths(tree, rename) {
    function visit(node) {
        if (node.type === 'split') return { ...node, children: node.children.map(visit) };
        const tabs = [];
        node.tabs.forEach((t) => {
            const p = rename(t.path);
            if (p && !tabs.some((x) => x.path === p)) tabs.push({ ...t, path: p });
        });
        const active = node.active ? rename(node.active) : null;
        return { ...node, tabs, active: tabs.some((t) => t.path === active) ? active : tabs[0] ? tabs[0].path : null };
    }
    return visit(tree);
}

/** Drop tabs whose paths no longer exist (after load or delete). */
export function pruneTabs(tree, exists) {
    return renamePaths(tree, (p) => (exists(p) ? p : null));
}

export function serialize(tree) {
    return JSON.parse(JSON.stringify(tree));
}

export function isValidTree(node) {
    if (!node || typeof node !== 'object') return false;
    if (node.type === 'group') return Array.isArray(node.tabs) && typeof node.id === 'string';
    if (node.type === 'split')
        return (
            (node.dir === 'row' || node.dir === 'column') &&
            Array.isArray(node.children) &&
            node.children.every(isValidTree)
        );
    return false;
}

/**
 * The group beside `groupId` in direction `dir` ('row' = to the right, 'column' = below):
 * climb to the nearest split in that direction where our branch isn't the last child, then take
 * the first group of the next branch. Null when there is none.
 */
export function neighborGroup(tree, groupId, dir) {
    const path = [];
    function find(node) {
        if (node.type === 'group') return node.id === groupId;
        for (let i = 0; i < node.children.length; i += 1) {
            path.push({ node, index: i });
            if (find(node.children[i])) return true;
            path.pop();
        }
        return false;
    }
    if (!find(tree)) return null;
    for (let i = path.length - 1; i >= 0; i -= 1) {
        const { node, index } = path[i];
        if (node.dir === (dir || 'row') && index < node.children.length - 1)
            return groups(node.children[index + 1])[0] || null;
    }
    return null;
}
