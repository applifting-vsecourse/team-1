import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { ArrowRight, BedDouble, CalendarRange, ListChecks, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { FeatureCard } from "@/components/molecules/FeatureCard"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Button } from "@/components/ui/button"

import { authSessionQueryOptions } from "@/features/auth/api/authSessionQueryOptions"
import { accountHome } from "@/features/auth/lib/account-home"

export const Route = createFileRoute("/")({
  // The landing is for signed-out visitors; a signed-in user (e.g. clicking the logo) goes back to their area.
  loader: async ({ context }) => {
    // A failed session request must not take the public page down: show it as signed out.
    const session = await context.queryClient
      .ensureQueryData(authSessionQueryOptions())
      .catch(() => null)
    if (!session) return
    const home = accountHome(session.user)
    if (home !== ROUTES.home) throw redirect({ to: home })
  },
  component: LandingPage,
})

const FEATURES = [
  { key: "multiTerm", icon: CalendarRange },
  { key: "capacity", icon: BedDouble },
  { key: "waitlist", icon: ListChecks },
  { key: "payments", icon: Wallet },
] as const

// US-96. Static page: what Togena does and the fork into the organizer and participant sign-in.
// Figma (Design system): V08 Landing page produktu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12734-1364
// Figma (Design system): M07 Landing page produktu · mobil · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12734-16749
// Figma (Remake): V08 Landing page produktu · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=10-20
// Figma (Remake): M07 Landing page produktu · mobil · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=10-157
function LandingPage() {
  const { t } = useTranslation("landing")

  return (
    <>
      <Seo />
      <PublicLayout
        isFullWidth
        footer={t("footer")}
      >
        <section className="mx-auto flex w-full max-w-200 flex-col items-center gap-6 px-4 py-16 text-center md:py-28">
          <h1 className="text-4xl font-bold md:text-6xl md:leading-16">
            {t("title")} <span className="text-primary">{t("titleAccent")}</span>
          </h1>
          <p className="text-lg text-muted-foreground">{t("description")}</p>
          <div className="flex w-full flex-col gap-3 pt-4 md:w-auto md:flex-row">
            <Button
              asChild
              size="xl"
            >
              <Link to={ROUTES.organizer.login}>
                {t("organizerCta")}
                <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
            >
              <Link to={ROUTES.participant.login}>
                {t("participantCta")}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>

        <section className="border-y border-border bg-muted px-4 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
            <h2 className="text-center text-3xl font-bold md:text-4xl">{t("features.title")}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {FEATURES.map(({ key, icon }) => (
                <FeatureCard
                  key={key}
                  icon={icon}
                  title={t(`features.${key}.title`)}
                  description={t(`features.${key}.body`)}
                />
              ))}
            </div>
          </div>
        </section>
      </PublicLayout>
    </>
  )
}
