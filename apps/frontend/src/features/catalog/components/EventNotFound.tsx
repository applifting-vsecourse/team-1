import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { Seo } from "@/components/atoms/Seo"
import { SystemStatusLayout } from "@/components/templates/SystemStatusLayout"

// Figma: Veřejná stránka nedostupná · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20188-6929
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
        <BackLink to={ROUTES.home}>{t("notFound.action")}</BackLink>
      </SystemStatusLayout>
    </>
  )
}
