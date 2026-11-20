// Lucide icon picker: a searchable, keyboard-accessible grid of every lucide icon.
// Names come from the full sprite (components:icon loadIcons(), the same /rp/icons/lucide JSON
// the portal uses), searched locally with the server's ranking (exact, prefix, then
// alphabetical; lucide aliases too). Before the sprite has loaded, the search goes to the studio
// API (GET /icons?q=). Moving through the grid previews the icon live (onPreview); Enter or a
// click picks it.
//
// Keys: type to search · ↓ from the search box into the grid · arrows / Home / End / PageUp /
// PageDown move · Enter picks · Escape closes.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Icon, loadIcons, allIconNames, hasIcon } from '#/components/ui/icon';
import { menusApi } from './menus-api';

const SHOW = 240;

function normalize(q) {
    return String(q || '')
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase()
        .replace(/[\s_]+/g, ' ');
}

function rank(names, query) {
    const terms = normalize(query).replace(/-/g, ' ').split(/\s+/).filter(Boolean);
    if (!terms.length) return names;
    const joined = terms.join('-');
    const hits = names.filter((n) => terms.every((t) => n.indexOf(t) >= 0));
    const r = (n) => (n === joined ? 0 : n.indexOf(joined) === 0 ? 1 : 2);
    return hits.sort((a, b) => r(a) - r(b) || (a < b ? -1 : a > b ? 1 : 0));
}

// Re-render when the sprite arrives (the icon module notifies through its own store).
function useSpriteNames() {
    const [names, setNames] = useState(() => allIconNames());
    useEffect(() => {
        let alive = true;
        loadIcons().then(() => alive && setNames(allIconNames()));
        return () => {
            alive = false;
        };
    }, []);
    return names;
}

export function IconPicker({ value, onPick, onPreview, disabled }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="rpm-icon-field" data-rpm-icon-field="">
            <div className="rpm-icon-current">
                <button
                    type="button"
                    className="rpm-icon-btn"
                    onClick={() => setOpen((o) => !o)}
                    disabled={disabled}
                    aria-expanded={open}
                    title="Choose an icon"
                    data-rpm-icon-open=""
                >
                    <span className="rpm-icon-swatch">
                        {value ? <Icon name={value} size={18} /> : <span className="rpm-icon-none">none</span>}
                    </span>
                    <span className="rpm-icon-name">{value || 'No icon'}</span>
                </button>
                {value ? (
                    <button
                        type="button"
                        className="rps-icon-btn"
                        title="Remove the icon"
                        onClick={() => onPick('')}
                        disabled={disabled}
                        data-rpm-icon-clear=""
                    >
                        <X size={13} />
                    </button>
                ) : null}
            </div>
            {open ? (
                <IconGrid
                    value={value}
                    onPick={(name) => {
                        setOpen(false);
                        onPreview && onPreview(null);
                        onPick(name);
                    }}
                    onPreview={onPreview}
                    onClose={() => {
                        setOpen(false);
                        onPreview && onPreview(null);
                    }}
                />
            ) : null}
        </div>
    );
}

function IconGrid({ value, onPick, onPreview, onClose }) {
    const names = useSpriteNames();
    const spriteReady = names.length > 200;
    const [query, setQuery] = useState('');
    const [remote, setRemote] = useState(null); // server search results while the sprite loads
    const [active, setActive] = useState(0);
    const gridRef = useRef(null);
    const searchRef = useRef(null);
    const [cols, setCols] = useState(8);

    useEffect(() => {
        if (searchRef.current) searchRef.current.focus();
    }, []);

    useEffect(() => {
        if (spriteReady) return undefined;
        let alive = true;
        const t = setTimeout(() => {
            menusApi
                .icons(query, SHOW)
                .then((r) => alive && setRemote(r))
                .catch(() => alive && setRemote(null));
        }, 150);
        return () => {
            alive = false;
            clearTimeout(t);
        };
    }, [query, spriteReady]);

    const results = useMemo(() => {
        if (spriteReady) return rank(names, query);
        if (remote) return remote.names;
        return rank(names, query);
    }, [names, query, spriteReady, remote]);
    const total = spriteReady || !remote ? results.length : remote.total;
    const shown = results.slice(0, SHOW);

    // Start on the current icon when it's in view.
    useEffect(() => {
        const i = value ? shown.indexOf(value) : -1;
        setActive(i >= 0 ? i : 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, spriteReady]);

    useEffect(() => {
        const el = gridRef.current;
        if (!el) return undefined;
        const measure = () => setCols(Math.max(1, Math.floor((el.clientWidth - 8) / 40)));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const el = gridRef.current && gridRef.current.querySelector(`[data-index="${active}"]`);
        if (el) el.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const move = (i) => {
        const next = Math.max(0, Math.min(shown.length - 1, i));
        setActive(next);
        if (onPreview && shown[next]) onPreview(shown[next]);
    };

    const onGridKey = (e) => {
        const k = e.key;
        if (k === 'ArrowRight') move(active + 1);
        else if (k === 'ArrowLeft') move(active - 1);
        else if (k === 'ArrowDown') move(active + cols);
        else if (k === 'ArrowUp') {
            if (active < cols) {
                searchRef.current && searchRef.current.focus();
            } else move(active - cols);
        } else if (k === 'Home') move(0);
        else if (k === 'End') move(shown.length - 1);
        else if (k === 'PageDown') move(active + cols * 4);
        else if (k === 'PageUp') move(active - cols * 4);
        else if (k === 'Enter' || k === ' ') {
            if (shown[active]) onPick(shown[active]);
        } else if (k === 'Escape') onClose();
        else return;
        e.preventDefault();
        e.stopPropagation();
    };

    const activeName = shown[active] || '';
    return (
        <div className="rpm-icon-picker" data-rpm-icon-picker="">
            <div className="rpm-icon-search">
                <Search size={13} />
                <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    placeholder="Search lucide icons (home, chart, user…)"
                    aria-label="Search icons"
                    aria-controls="rpm-icon-grid"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown' || e.key === 'Enter') {
                            e.preventDefault();
                            if (e.key === 'Enter' && shown[active]) return onPick(shown[active]);
                            move(active);
                            gridRef.current && gridRef.current.focus();
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }
                    }}
                    data-rpm-icon-search=""
                />
            </div>
            <div
                ref={gridRef}
                id="rpm-icon-grid"
                className="rpm-icon-grid"
                role="listbox"
                aria-label={`Icons (${total})`}
                tabIndex={0}
                aria-activedescendant={activeName ? `rpm-icon-${activeName}` : undefined}
                onKeyDown={onGridKey}
                onFocus={() => onPreview && activeName && onPreview(activeName)}
                data-rpm-icon-grid=""
            >
                {shown.map((name, i) => (
                    <div
                        key={name}
                        id={`rpm-icon-${name}`}
                        role="option"
                        aria-selected={i === active}
                        aria-label={name}
                        title={name}
                        data-index={i}
                        data-icon-name={name}
                        className={
                            'rpm-icon-cell' + (i === active ? ' active' : '') + (name === value ? ' current' : '')
                        }
                        onMouseEnter={() => onPreview && onPreview(name)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onPick(name)}
                    >
                        <Icon name={name} size={20} />
                    </div>
                ))}
            </div>
            <div className="rpm-icon-foot">
                <span>{activeName || (query ? 'No match' : '')}</span>
                <span style={{ flex: 1 }} />
                <span>
                    {total > SHOW ? `${SHOW} of ${total}` : `${total} icon${total === 1 ? '' : 's'}`}
                    {spriteReady ? '' : ' · loading the full set…'}
                </span>
            </div>
        </div>
    );
}

export { hasIcon };
