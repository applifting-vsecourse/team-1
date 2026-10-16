import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"
import { PublicLayout } from "@/components/templates/PublicLayout"

export const Route = createFileRoute("/apply/$token")({
  component: ApplicationFormPage,
})

// Skeleton — US-23 (form), US-40 (live price). Unknown token → 404.
function ApplicationFormPage() {
  const { t } = useTranslation(["applicationForm", "common"])

  return (
    <>
      <Seo title={t("form.title")} />
      <PublicLayout>
        <PageHeader
          title={t("form.title")}
          description={t("common:comingSoon", { story: "US-23" })}
        />
      </PublicLayout>
    </>
  )
}
