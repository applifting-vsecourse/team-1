import type { ReactNode } from "react"
import { useLocation, useNavigate } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

// #764 reuses the transport dialog pattern over the application detail for both preferences forms.
// Figma: Design system v2 · #402 / Výběr způsobu dopravy · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-39327 (360 px: https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-39416)
export function ApplicationPreferencesDialog({
  applicationId,
  editor,
  title,
  isSaving,
  children,
}: {
  applicationId: string
  editor: "meals" | "health"
  title: string
  isSaving: boolean
  children: (close: () => Promise<void>) => ReactNode
}) {
  const navigate = useNavigate()
  const hash = useLocation({ select: (location) => location.hash })

  const close = async () => {
    await navigate({ to: ROUTES.participant.application, params: { applicationId }, replace: true })
    requestAnimationFrame(() => {
      const route =
        editor === "meals"
          ? ROUTES.participant.applicationMeals
          : ROUTES.participant.applicationHealth
      const href = route.replace("$applicationId", encodeURIComponent(applicationId))
      Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .find((link) => link.pathname === href && (!hash || link.hash === `#${hash}`))
        ?.focus()
    })
  }

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSaving) void close()
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="gap-4 sm:max-w-180"
      >
        <Seo title={title} />
        <DialogTitle>{title}</DialogTitle>
        {children(close)}
      </DialogContent>
    </Dialog>
  )
}
