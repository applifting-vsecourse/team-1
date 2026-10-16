import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ErrorLayout } from "@/components/templates/ErrorLayout"
import { Button } from "@/components/ui/button"

/** 403 — shows nothing of the record that was asked for (US-02, US-10). */
export function ForbiddenPage() {
  const { t } = useTranslation()

  return (
    <ErrorLayout
      title={t("pages.forbidden.title")}
      description={t("pages.forbidden.description")}
      action={
        <Button asChild>
          <Link to={ROUTES.home}>{t("pages.forbidden.action")}</Link>
        </Button>
      }
    />
  )
}
