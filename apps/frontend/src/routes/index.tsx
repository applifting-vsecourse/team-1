import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { BedDouble, Calendar, ClipboardList, Wallet } from "lucide-react"
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
  { key: "multiTerm", icon: Calendar },
  { key: "capacity", icon: BedDouble },
  { key: "waitlist", icon: ClipboardList },
  { key: "payments", icon: Wallet },
] as const

// US-96. Static page: what Togena does and the fork into the organizer and participant sign-in.
// Figma (Design system): V08 Landing page produktu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12734-1364
// Figma (Design system): M07 Landing page produktu · mobil · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12734-16749
function LandingPage() {
  const { t } = useTranslation("landing")

  return (
    <>
      <Seo />
      <PublicLayout
        isFullWidth
        footer={t("footer")}
      >
        <section className="mx-auto flex w-full max-w-224 flex-col items-center gap-6 px-4 py-12 text-center md:py-28">
          <h1 className="text-4xl leading-11 font-bold md:text-6xl md:leading-16">
            {t("title")} <span className="text-link">{t("titleAccent")}</span>
          </h1>
          <p className="max-w-180 text-lg text-muted-foreground">{t("description")}</p>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <Button
              asChild
              size="lg"
              className="md:w-50"
            >
              <Link to={ROUTES.organizer.login}>{t("organizerCta")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="md:w-50"
            >
              <Link to={ROUTES.participant.login}>{t("participantCta")}</Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border bg-muted px-4 py-12 md:py-24">
          <div className="mx-auto flex w-full max-w-224 flex-col gap-6 md:gap-10">
            <h2 className="text-center text-2xl font-semibold">{t("features.title")}</h2>
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
