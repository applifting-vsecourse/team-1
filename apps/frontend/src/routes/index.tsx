import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

// Skeleton only — content and copy come with US-96 (Landing page produktu).
function LandingPage() {
  const { t } = useTranslation("landing")

  return (
    <>
      <Seo />
      <PublicLayout>
        <section className="flex flex-col gap-6 py-8">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to={ROUTES.organizer.login}>{t("organizerCta")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
            >
              <Link to={ROUTES.participant.login}>{t("participantCta")}</Link>
            </Button>
          </div>
        </section>
      </PublicLayout>
    </>
  )
}
