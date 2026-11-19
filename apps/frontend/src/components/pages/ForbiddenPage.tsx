import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import arrow from "@/assets/status/arrow-left.svg"
import { SystemStatusLayout } from "@/components/templates/SystemStatusLayout"
import { Button } from "@/components/ui/button"

type Props = {
  title?: string
  description?: string
  back?: { to: string; label: string }
  accountAction?: ReactNode
}

// Figma: 403 přihlašovatel a cizí záznam · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15377-161 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18602-22496
export function ForbiddenPage({ title, description, back, accountAction }: Props) {
  const { t } = useTranslation()
  return (
    <SystemStatusLayout
      code={403}
      variant={accountAction ? "compact" : "band"}
      title={title ?? t("pages.forbidden.title")}
      description={description ?? t("pages.forbidden.description")}
    >
      <Button
        asChild
        variant="ghost"
        className="h-9 self-start rounded-full bg-accent px-4 text-link hover:bg-accent/80"
      >
        <Link to={back?.to ?? ROUTES.home}>
          <img
            src={arrow}
            alt=""
          />
          {back?.label ?? t("pages.forbidden.action")}
        </Link>
      </Button>
      {accountAction}
    </SystemStatusLayout>
  )
}
