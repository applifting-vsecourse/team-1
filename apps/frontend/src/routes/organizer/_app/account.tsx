import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

export const Route = createFileRoute("/organizer/_app/account")({
  component: OrganizerAccountPage,
})

// Skeleton — US-02 (O30).
function OrganizerAccountPage() {
  const { t } = useTranslation(["auth", "common"])

  return (
    <>
      <Seo title={t("account.title")} />
      <PageHeader
        title={t("account.title")}
        description={t("common:comingSoon", { story: "US-02 (O30)" })}
      />
    </>
  )
}
