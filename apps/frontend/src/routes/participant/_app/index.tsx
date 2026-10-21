import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"

import { useSession } from "@/features/auth/hooks/useSession"
import { ApplicationList } from "@/features/participant/components/ApplicationList"

export const Route = createFileRoute("/participant/_app/")({
  component: ParticipantApplicationsPage,
})

// US-54 (U01): every application under the signed-in participant account.
// Figma (Design system): U01 Přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12092-104
function ParticipantApplicationsPage() {
  const { t } = useTranslation("participant")
  const { user } = useSession()

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("applications.title")} />
      <PageHeader
        title={t("applications.title")}
        description={user ? t("applications.description", { name: user.name }) : undefined}
      />
      <ApplicationList />
    </div>
  )
}
