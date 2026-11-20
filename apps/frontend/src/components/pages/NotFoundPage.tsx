import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { SystemStatusLayout } from "@/components/templates/SystemStatusLayout"
import { Button } from "@/components/ui/button"

// Figma: Obecná 404 · desktop 20125:1914, mobil 20125:1941 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20125-1914
export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <SystemStatusLayout
      code={404}
      title={t("pages.notFound.title")}
      description={t("pages.notFound.description")}
    >
      <Button
        asChild
        size="lg"
        className="h-12 w-full"
      >
        <Link to={ROUTES.home}>{t("pages.notFound.action")}</Link>
      </Button>
    </SystemStatusLayout>
  )
}
