import type { ReactNode } from "react"
import type { LinkProps } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { SystemStatusLayout } from "@/components/templates/SystemStatusLayout"

type Props = {
  title?: string
  description?: string
  back?: { to: NonNullable<LinkProps["to"]>; label: string }
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
      <BackLink to={back?.to ?? ROUTES.home}>{back?.label ?? t("pages.forbidden.action")}</BackLink>
      {accountAction}
    </SystemStatusLayout>
  )
}
