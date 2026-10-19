import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { PageHeader } from "@/components/molecules/PageHeader"
import { Button } from "@/components/ui/button"

import { useSession } from "@/features/auth/hooks/useSession"

export const Route = createFileRoute("/organizer/_app/")({
  component: OrganizerDashboardPage,
})

// US-02 (O01): where an organizer lands after signing in. The list of events
// opens from the navigation (US-12); attention panel and event cards come with
// US-29 / US-52.
function OrganizerDashboardPage() {
  const { t } = useTranslation("eventOverview")
  const { user } = useSession()

  return (
    <>
      <Seo title={t("dashboard.title")} />
      <PageHeader
        title={t("dashboard.greeting", { name: user?.name ?? "" })}
        description={t("dashboard.description")}
        actions={
          <Button asChild>
            <Link to={ROUTES.organizer.events}>{t("dashboard.openEvents")}</Link>
          </Button>
        }
      />
    </>
  )
}
