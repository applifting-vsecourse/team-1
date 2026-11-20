import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { SystemStatusLayout } from "@/components/templates/SystemStatusLayout"
import { Button } from "@/components/ui/button"

// Figma: Veřejná stránka nedostupná · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15399-10068
export function ApplicationLinkNotFound() {
  const { t } = useTranslation("applicationForm")
  return (
    <>
      <Seo title={t("notFound.title")} />
      <SystemStatusLayout
        code={404}
        title={t("notFound.title")}
        description={t("notFound.description")}
        variant="band"
      >
        <Button
          asChild
          size="lg"
          className="h-12 w-full"
        >
          <Link to={ROUTES.home}>{t("notFound.action")}</Link>
        </Button>
      </SystemStatusLayout>
    </>
  )
}
