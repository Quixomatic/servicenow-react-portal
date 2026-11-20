---
title: Theme
description: useTheme — light, dark and system mode with the next-themes API, adapted to shadow DOM.
section: Runtime API
order: 5
tags: [useTheme, dark-mode]
---

# Theme

`useTheme()` reads and sets the light, dark or system color mode. The theme record's tokens decide the colors; this hook only decides which set applies.

## `useTheme()`

```ts
useTheme(): {
    theme: 'light' | 'dark' | 'system'
    setTheme(theme: 'light' | 'dark' | 'system'): void
    resolvedTheme: 'light' | 'dark'
    systemTheme: 'light' | 'dark'
    themes: ['light', 'dark', 'system']
}
```

It's the next-themes API, adapted to shadow DOM (next-themes itself targets `<html>`, which the host's shadow root never sees).

- The default is `system`, which follows `prefers-color-scheme` live.
- The choice persists in `localStorage['rp-theme']` and syncs across tabs.
- It's read synchronously at module load, so the first render already knows the mode (no flash).
- The host element gets the `dark` class (and `color-scheme`); the renderer mirrors it onto the overlay layer, so dialogs, menus and popovers follow.
- One store per page: every host instance and Portal Studio share it.

A mode toggle, shadcn's ModeToggle pattern:

```tsx
import { useTheme } from '@portal/runtime'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from 'components:dropdown-menu'
import { Button } from 'components:button'

const MODES = ['light', 'dark', 'system'] as const

export function ModeToggle() {
    const { theme, setTheme } = useTheme()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" aria-label="Toggle theme" />}>Theme</DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {MODES.map((m) => (
                    <DropdownMenuItem key={m} onClick={() => setTheme(m)}>
                        {m}
                        {theme === m ? <span className="ml-auto text-xs text-muted-foreground">✓</span> : null}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
```

The seed's `app/site-header` ships this pattern with sun and moon icons (`parts/ModeToggle.tsx`).

Style for dark mode with Tailwind's `dark:` variant, or with `:host(.dark)` selectors in `styles.css`. Theme tokens switch automatically. See [Themes](../concepts/themes.md).

## Related

- [Themes](../concepts/themes.md)
- [Styling](../authoring/styling.md)
