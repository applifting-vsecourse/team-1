import { createFileRoute, Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Logo } from "@/components/atoms/Logo"
import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { redirectSignedIn } from "@/features/auth/lib/redirect-signed-in"
import { LandingClosing } from "@/features/landing/components/LandingClosing"
import { LandingFeatures } from "@/features/landing/components/LandingFeatures"
import { LandingHero } from "@/features/landing/components/LandingHero"
import { LANDING_CONTENT } from "@/features/landing/lib/layout"

export const Route = createFileRoute("/")({
  // beforeLoad, not loader: a landing the router has already cached (visited signed out) would
  // otherwise render at once while the loader redirects, which is a visible flash of the landing.
  beforeLoad: ({ context }) => redirectSignedIn(context.queryClient),
  component: LandingPage,
})

// Landing of the product: hero with the two entries, what Togena does, closing with the same entries.
// Figma (Design system): Landing page / CZ / Desktop · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-10977
// Figma (Design system): Landing page / CZ / Mobile · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-11536
function LandingPage() {
  const { t } = useTranslation("landing")

  return (
    <>
      <Seo />
      <PublicLayout
        isFullWidth
        headerContentClassName="min-h-[55px] py-1 md:min-h-[71px] md:py-2"
        nav={
          <div className="ml-4 hidden items-center gap-1 md:flex">
            <Button
              asChild
              variant="ghost"
            >
              <Link to={ROUTES.catalog}>{t("nav.catalog")}</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
            >
              <a href="#organizers">{t("nav.organizers")}</a>
            </Button>
            <Button
              asChild
              variant="ghost"
            >
              <Link to={ROUTES.participant.login}>{t("footerLinks.myApplications")}</Link>
            </Button>
          </div>
        }
        footer={
          <div
            className={cn(
              LANDING_CONTENT,
              "flex flex-col gap-6 py-8 md:flex-row md:justify-between md:py-12",
            )}
          >
            <div className="flex flex-col gap-2">
              <Logo />
              <p className="text-sm text-muted-foreground">{t("footer")}</p>
            </div>
            <div className="flex gap-8 md:gap-16">
              <nav className="flex flex-col gap-3 text-sm">
                <p className="font-semibold text-link">{t("footerLinks.organizers")}</p>
                <Link
                  to={ROUTES.organizer.register}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t("footerLinks.register")}
                </Link>
                <Link
                  to={ROUTES.organizer.login}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t("footerLinks.login")}
                </Link>
              </nav>
              <nav className="flex flex-col gap-3 text-sm">
                <p className="font-semibold text-link">{t("footerLinks.participants")}</p>
                <Link
                  to={ROUTES.catalog}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t("nav.catalog")}
                </Link>
                <Link
                  to={ROUTES.participant.login}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t("footerLinks.myApplications")}
                </Link>
              </nav>
            </div>
          </div>
        }
      >
        <LandingHero />
        <LandingFeatures />
        <LandingClosing />
      </PublicLayout>
    </>
  )
}
