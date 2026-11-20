// Light / dark / system switcher (shadcn's ModeToggle pattern). useTheme() is the host's
// next-themes-style API: the mode applies to the whole portal (host element + overlays).
import { useTheme } from '@portal/runtime';
import { Button } from 'components:button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from 'components:dropdown-menu';

const Sun = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
    >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
);

const Moon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
    >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
);

const MODES = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
] as const;

export function ModeToggle() {
    const { theme, setTheme } = useTheme();
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="outline" size="icon" aria-label="Toggle theme" className="relative" />}
            >
                <Sun />
                <Moon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {MODES.map((m) => (
                    <DropdownMenuItem key={m.value} onClick={() => setTheme(m.value)}>
                        {m.label}
                        {theme === m.value ? <span className="ml-auto text-xs text-muted-foreground">✓</span> : null}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
