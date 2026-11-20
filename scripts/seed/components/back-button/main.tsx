/**
 * components:app/back-button: the Back affordance (.plans/back-navigation.md, James's decisions 3 and 7).
 *
 *   <BackButton parent={{ to: 'list', table: 'incident', label: 'Incidents' }} />
 *
 * The behaviour is the host's useBackTarget() (@portal/runtime): the previous entry of this tab's
 * history in this portal (skipping blank new-record forms, deleted records and the same page), else the
 * declared `parent` (deep links, a new tab), else the portal home. Clicking runs the navigation guards
 * (an unsaved form asks first). This primitive only renders: nothing when there's nowhere to go.
 *
 * Props:
 *   parent        { to, table?, sysId?, recordId?, query?, q?, view?, label? } or null
 *   fallbackHome  default true (false: no button rather than "Back to Home")
 *   display       'auto' (default: arrow + label from sm up, arrow only below), 'icon', 'label'
 *   variant       a components:button variant (default 'ghost')
 *   size          'sm' (default) | 'xs' | 'default'
 *   label         override the visible text (the aria-label stays the full "Back to …")
 *   onBack        called after a successful Back
 *
 * Reusable exports: BackButton, useBack (useBackTarget re-exported for widgets that render their own).
 */
import { useBackTarget } from '@portal/runtime';
import { Button } from 'components:button';
import { Icon } from 'components:icon';

export type BackParent = {
    to: string;
    portalSlug?: string;
    table?: string;
    sysId?: string;
    recordId?: string;
    query?: string;
    q?: string | Record<string, unknown>;
    view?: string;
    label?: string;
};

export type BackButtonProps = {
    parent?: BackParent | null;
    fallbackHome?: boolean;
    display?: 'auto' | 'icon' | 'label';
    variant?: 'ghost' | 'outline' | 'secondary' | 'link' | 'default';
    size?: 'xs' | 'sm' | 'default';
    label?: string;
    className?: string;
    onBack?: () => void;
};

/** useBackTarget, for widgets that render their own Back (same options). */
export function useBack(opts?: { parent?: BackParent | null; fallbackHome?: boolean }) {
    return useBackTarget(opts) as {
        available: boolean;
        label: string;
        title: string;
        source: 'history' | 'parent' | 'browser' | 'home' | 'none';
        go: () => Promise<boolean>;
    };
}

const ICON_SIZE: Record<string, string> = { xs: 'icon-xs', sm: 'icon-sm', default: 'icon' };

export function BackButton({
    parent,
    fallbackHome,
    display = 'auto',
    variant = 'ghost',
    size = 'sm',
    label,
    className,
    onBack,
}: BackButtonProps) {
    const back = useBack({ parent: parent || null, fallbackHome });
    if (!back.available) return null;
    const full = back.label || 'Back';
    const text = label || full;
    const onClick = () => {
        back.go().then((went) => {
            if (went && onBack) onBack();
        });
    };
    if (display === 'icon') {
        return (
            <Button
                variant={variant}
                size={(ICON_SIZE[size] || 'icon-sm') as any}
                aria-label={full}
                title={full}
                className={['shrink-0', className].filter(Boolean).join(' ')}
                onClick={onClick}
                data-rp-back=""
                data-rp-back-source={back.source}
            >
                <Icon name="arrow-left" />
            </Button>
        );
    }
    // 'auto': arrow + label from sm up; arrow only (square) below. 'label': always both.
    const auto = display === 'auto';
    return (
        <Button
            variant={variant}
            size={size as any}
            aria-label={full}
            title={full}
            className={['max-w-64 min-w-0 shrink-0', auto ? 'max-sm:aspect-square max-sm:px-0' : '', className]
                .filter(Boolean)
                .join(' ')}
            onClick={onClick}
            data-rp-back=""
            data-rp-back-source={back.source}
        >
            <Icon name="arrow-left" />
            <span className={['truncate', auto ? 'max-sm:hidden' : ''].filter(Boolean).join(' ')}>{text}</span>
        </Button>
    );
}

/** Preview (Studio / primitives gallery): a Back button with a declared parent. */
export default function BackButtonPreview() {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <BackButton parent={{ to: '', label: 'Home' }} />
            <BackButton parent={{ to: '', label: 'Home' }} display="icon" />
            <BackButton parent={{ to: '', label: 'Home' }} display="label" variant="outline" />
        </div>
    );
}
