import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BrandComposition } from "@/components/atoms/BrandComposition"
import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

const FEATURES = ["multiTerm", "capacity", "waitlist", "payments"] as const

// US-96. Static page: what Togena does and the way to the organizer sign-in.
// Participants reach their sign-in from S01 or from their e-mails.
// Figma (Design system): V08 Landing page produktu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12734-1364
// Figma (Design system): M07 Landing page produktu · mobil · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12734-16749
function LandingPage() {
  const { t } = useTranslation("landing")

  return (
    <>
      <Seo />
      <PublicLayout footer={t("footer")}>
        <div className="flex flex-col gap-8 md:gap-12 md:py-8">
          <section className="flex flex-col gap-6">
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl md:leading-18 md:font-extrabold">
              {t("title")}
            </h1>
            <p className="text-muted-foreground">{t("description")}</p>
            <Button
              asChild
              className="w-full md:w-86"
            >
              <Link to={ROUTES.organizer.login}>{t("organizerCta")}</Link>
            </Button>
            <BrandComposition className="w-full md:w-130" />
          </section>

          <section className="flex flex-col gap-8">
            <h2 className="text-2xl font-bold tracking-tight">{t("features.title")}</h2>
            {FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex flex-col gap-2"
              >
                <h3 className="text-lg font-bold">{t(`features.${feature}.title`)}</h3>
                <p className="text-muted-foreground">{t(`features.${feature}.body`)}</p>
              </div>
            ))}
          </section>
        </div>
      </PublicLayout>
    </>
  )
}
