import * as React from "react"
import { createPortal } from "react-dom"
import { Toaster as Sonner } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { usePortalContainer } from "@servicenow/ui-renderer-react"
import { useTheme } from "#/runtime/theme-mode"

// shadcn's Sonner, adapted for shadow DOM: the theme comes from the host's useTheme() (not
// next-themes), and the toaster renders into the renderer's overlay layer, so toasts escape
// clipping containers and follow dark mode. Sonner's CSS ships in the framework stylesheet.
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
          "--border-radius": "var(--radius)"
        }
      }
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
