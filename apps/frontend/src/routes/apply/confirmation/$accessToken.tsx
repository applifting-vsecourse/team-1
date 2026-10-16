import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"
import { PublicLayout } from "@/components/templates/PublicLayout"

export const Route = createFileRoute("/apply/confirmation/$accessToken")({
  component: ApplicationConfirmationPage,
})

// Skeleton — US-25. Secret URL, so it survives a reload and can go in the e-mail.
function ApplicationConfirmationPage() {
  const { t } = useTranslation(["applicationForm", "common"])

  return (
    <>
      <Seo title={t("confirmation.title")} />
      <PublicLayout>
        <PageHeader
          title={t("confirmation.title")}
          description={t("common:comingSoon", { story: "US-25" })}
        />
      </PublicLayout>
    </>
  )
}
