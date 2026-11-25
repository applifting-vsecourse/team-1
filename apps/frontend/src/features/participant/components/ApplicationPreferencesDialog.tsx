import type { ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export function ApplicationPreferencesDialog({
  applicationId,
  editor,
  title,
  children,
}: {
  applicationId: string
  editor: "meals" | "health"
  title: string
  children: ReactNode
}) {
  const navigate = useNavigate()

  const close = async () => {
    await navigate({ to: ROUTES.participant.application, params: { applicationId }, replace: true })
    requestAnimationFrame(() => {
      const route =
        editor === "meals"
          ? ROUTES.participant.applicationMeals
          : ROUTES.participant.applicationHealth
      const href = route.replace("$applicationId", encodeURIComponent(applicationId))
      Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .find((link) => link.pathname === href)
        ?.focus()
    })
  }

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) void close()
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="gap-4 p-4 sm:max-w-180 sm:p-6"
      >
        <Seo title={title} />
        <DialogTitle>{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  )
}
