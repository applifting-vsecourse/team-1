import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ErrorLayout } from "@/components/templates/ErrorLayout"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <ErrorLayout
      title={t("pages.notFound.title")}
      description={t("pages.notFound.description")}
      action={
        <Button
          asChild
          size="lg"
        >
          <Link to={ROUTES.home}>{t("pages.notFound.action")}</Link>
        </Button>
      }
    />
  )
}
