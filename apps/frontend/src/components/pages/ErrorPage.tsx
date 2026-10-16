import { useTranslation } from "react-i18next"

import { ErrorLayout } from "@/components/templates/ErrorLayout"
import { Button } from "@/components/ui/button"

type ErrorPageProps = {
  error: Error
}

export function ErrorPage({ error }: ErrorPageProps) {
  const { t } = useTranslation()

  return (
    <ErrorLayout
      title={t("pages.error.title")}
      description={error.message || t("pages.error.description")}
      action={<Button onClick={() => window.location.reload()}>{t("pages.error.action")}</Button>}
    />
  )
}
