import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/templates/AuthLayout"
import { Button } from "@/components/ui/button"

type ForbiddenPageProps = {
  /** Replaces the default texts and button, e.g. for a participant in the organizer area (S06). */
  variant?: {
    description: string
    cardTitle: string
    body: string
    actions: ReactNode
  }
}

/** 403 — shows nothing of the record that was asked for (US-02, US-10). */
export function ForbiddenPage({ variant }: ForbiddenPageProps) {
  const { t } = useTranslation()

  return (
    <AuthLayout
      title={t("pages.forbidden.title")}
      description={variant?.description ?? `403 · ${t("pages.forbidden.description")}`}
      cardTitle={variant?.cardTitle ?? t("pages.forbidden.cardTitle")}
    >
      <div className="flex flex-col items-start gap-4 text-sm">
        <p>{variant?.body ?? t("pages.forbidden.body")}</p>
        {variant?.actions ?? (
          <Button asChild>
            <Link to={ROUTES.home}>{t("pages.forbidden.action")}</Link>
          </Button>
        )}
      </div>
    </AuthLayout>
  )
}
