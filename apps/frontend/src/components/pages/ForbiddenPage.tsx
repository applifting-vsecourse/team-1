import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Lock } from "lucide-react"
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
// Figma (Design system): S06 Zakázaný přístup · 403 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11987-141
// Figma (Remake): S06 Zakázaný přístup · 403 · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=21-570
export function ForbiddenPage({ variant }: ForbiddenPageProps) {
  const { t } = useTranslation()

  return (
    <AuthLayout
      icon={
        <div className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Lock
            aria-hidden
            className="size-6"
          />
        </div>
      }
      title={t("pages.forbidden.title")}
      description={variant?.description ?? `403 · ${t("pages.forbidden.description")}`}
      cardTitle={variant?.cardTitle ?? t("pages.forbidden.cardTitle")}
    >
      <p className="text-muted-foreground">{variant?.body ?? t("pages.forbidden.body")}</p>
      <div className="flex flex-col gap-3 pt-2">
        {variant?.actions ?? (
          <Button
            asChild
            size="xl"
            className="w-full"
          >
            <Link to={ROUTES.home}>
              {t("pages.forbidden.action")}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </AuthLayout>
  )
}
