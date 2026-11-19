import * as React from "react"
import { createPortal } from "react-dom"
import { Toaster as Sonner } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { usePortalContainer } from "#/runtime/overlay"
import { useTheme } from "#/runtime/theme-mode"

// shadcn's Sonner, adapted for shadow DOM: the theme comes from the host's useTheme() (not
// next-themes), and the toaster renders into the renderer's overlay layer, so toasts escape
// clipping containers and follow dark mode. Sonner's CSS ships in the framework stylesheet.
const tint = (accent, surface, pct) => `color-mix(in oklab, ${accent} ${pct}%, ${surface})`
const richOf = (name, accent) => ({
  [`--${name}-bg`]: tint(accent, "var(--popover)", 12),
  [`--${name}-border`]: tint(accent, "var(--popover)", 35),
  [`--${name}-text`]: tint(accent, "var(--popover-foreground)", 70),
})
const RICH = {
  ...richOf("success", "oklch(0.62 0.15 152)"),
  ...richOf("error", "var(--destructive)"),
  ...richOf("warning", "oklch(0.72 0.15 70)"),
  ...richOf("info", "var(--primary)"),
}

const Toaster = ({
  ...props
}) => {
  const { resolvedTheme } = useTheme()
  const container = usePortalContainer()

  const toaster = (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // richColors, theme-aware: each kind tints the popover surface and text with its accent
          // (error = --destructive, info = --primary; success/warning have no token, so a fixed
          // green/amber hue is mixed into the theme's own colours). Resolved in the overlay
          // layer, so they follow light/dark and the portal theme.
          ...RICH,
        }
      }
      // Clear of the Diagnostics pill (bottom-right) on narrow screens, where toasts span the width.
      mobileOffset={{ bottom: "5rem" }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )

  return container ? createPortal(toaster, container) : toaster
}

export { Toaster }
