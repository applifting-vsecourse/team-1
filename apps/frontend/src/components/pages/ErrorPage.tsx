import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { SystemStatusLayout } from "@/components/templates/SystemStatusLayout"
import { Button } from "@/components/ui/button"

// Figma: Něco se pokazilo · desktop 20125:1830, mobil 20125:1865 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20125-1830
export function ErrorPage({ error }: { error: unknown }) {
  const { t } = useTranslation()
  // Keep diagnostic details in the console.
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <SystemStatusLayout
      title={t("pages.error.title")}
      description={t("pages.error.description")}
    >
      <Button
        size="lg"
        className="h-12 w-full"
        onClick={() => window.location.reload()}
      >
        {t("pages.error.action")}
      </Button>
      <Button
        asChild
        variant="ghost"
        className="h-9 w-full"
      >
        <a href={ROUTES.home}>{t("pages.error.homeAction")}</a>
      </Button>
    </SystemStatusLayout>
  )
}
