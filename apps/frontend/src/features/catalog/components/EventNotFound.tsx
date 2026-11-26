import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { SystemStatusLayout } from "@/components/templates/SystemStatusLayout"
import { Button } from "@/components/ui/button"

// Figma: Veřejná stránka nedostupná · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20188-6929
// Figma (Design system v2): #738 Varianta B · Srozumitelnější 404 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27413-18070 (mobile 27413-18128)
export function EventNotFound() {
  const { t } = useTranslation("catalog")
  return (
    <>
      <Seo title={t("notFound.title")} />
      <SystemStatusLayout
        code={404}
        title={t("notFound.title")}
        description={t("notFound.description")}
        variant="divider"
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
