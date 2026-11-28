import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { SystemPageLayout } from "@/components/templates/SystemPageLayout"
import { Button } from "@/components/ui/button"

// Figma: Něco se pokazilo · desktop 20125:1830, mobil 20125:1865 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20125-1830
export function ErrorPage({ error }: { error: unknown }) {
  const { t } = useTranslation()
  // Keep diagnostic details in the console.
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <SystemPageLayout
      illustration="error"
      title={t("pages.error.title")}
    >
      <Button
        size="lg"
        className="w-full"
        onClick={() => window.location.reload()}
      >
        {t("pages.error.action")}
      </Button>
    </SystemPageLayout>
  )
}
