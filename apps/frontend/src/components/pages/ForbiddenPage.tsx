import type { ReactNode } from "react"
import type { LinkProps } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { SystemPageLayout } from "@/components/templates/SystemPageLayout"
import { Button } from "@/components/ui/button"

type Props = {
  /** The one way on: the account's own start. The events list by default (an organizer in the participant area). */
  back?: { to: NonNullable<LinkProps["to"]>; label: string }
  /** A quiet second action under it (the participant: sign in with another account). */
  accountAction?: ReactNode
}

// Figma: 403 přihlašovatel · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15377-161 (mobil 15377-183)
// Figma: 403 organizátor, cizí záznam · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18602-22496 (mobil 18602-22571)
export function ForbiddenPage({ back, accountAction }: Props) {
  const { t } = useTranslation()
  return (
    <SystemPageLayout
      illustration="lost"
      title={t("pages.forbidden.title")}
    >
      <Button
        asChild
        size="lg"
        className="w-full"
      >
        <Link to={back?.to ?? ROUTES.organizer.events}>
          {back?.label ?? t("pages.actions.events")}
        </Link>
      </Button>
      {accountAction}
    </SystemPageLayout>
  )
}
