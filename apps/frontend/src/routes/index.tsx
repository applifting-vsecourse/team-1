import type { ComponentType, ReactNode, SVGProps } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Clock, List } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import CampIllustration from "@/assets/illustrations/camp.svg?react"
import CapacityIllustration from "@/assets/illustrations/capacity.svg?react"
import CelebrateIllustration from "@/assets/illustrations/celebrate.svg?react"
import ChildrenIllustration from "@/assets/illustrations/children.svg?react"
import ConferenceIllustration from "@/assets/illustrations/conference.svg?react"
import DashboardIllustration from "@/assets/illustrations/dashboard.svg?react"
import HikingIllustration from "@/assets/illustrations/hiking.svg?react"
import PaymentsIllustration from "@/assets/illustrations/payments.svg?react"
import ScheduleIllustration from "@/assets/illustrations/schedule.svg?react"
import SignUpIllustration from "@/assets/illustrations/sign-up.svg?react"
import { Logo } from "@/components/atoms/Logo"
import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

import { redirectSignedIn } from "@/features/auth/lib/redirect-signed-in"

export const Route = createFileRoute("/")({
  // beforeLoad, not loader: a landing the router has already cached (visited signed out) would
  // otherwise render at once while the loader redirects, which is a visible flash of the landing.
  beforeLoad: ({ context }) => redirectSignedIn(context.queryClient),
  component: LandingPage,
})

type Illustration = ComponentType<SVGProps<SVGSVGElement>>

const EVENT_TYPES = [
  { key: "camps", illustration: ChildrenIllustration },
  { key: "conferences", illustration: ConferenceIllustration },
  { key: "trips", illustration: HikingIllustration },
] as const

const FEATURES = [
  { key: "multiTerm", illustration: ScheduleIllustration },
  { key: "capacity", illustration: CapacityIllustration },
  { key: "payments", illustration: PaymentsIllustration },
] as const

const CONTENT = "mx-auto w-full max-w-300 px-4 md:px-6"

/** Decorative unDraw illustration in the theme colours (see `assets/illustrations/README.md`). */
function Art({ illustration: Svg, className }: { illustration: Illustration; className?: string }) {
  return (
    <Svg
      aria-hidden
      className={cn("h-auto w-full", className)}
    />
  )
}

function CatalogButton({
  className,
  isOnPrimary = false,
}: {
  className?: string
  isOnPrimary?: boolean
}) {
  const { t } = useTranslation("landing")

  return (
    <Button
      asChild
      size="lg"
      variant="outline"
      className={cn(
        isOnPrimary
          ? "border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          : "border-primary bg-accent text-link hover:bg-accent/80",
        className,
      )}
    >
      <Link to={ROUTES.catalog}>
        <List aria-hidden />
        {t("catalogLink")}
      </Link>
    </Button>
  )
}

// Rotated "product" cards over the hero illustration: what the organizer sees. Sample data, decorative.
function HeroVisual() {
  const { t } = useTranslation("landing")

  return (
    <div className="relative flex flex-col gap-4 md:block">
      <Art
        illustration={CampIllustration}
        className="md:px-4"
      />
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm md:absolute md:-bottom-6 md:left-0 md:w-80 md:rotate-6">
        <div className="flex items-center justify-between gap-2 text-sm font-semibold">
          <span>{t("preview.event")}</span>
          <span className="font-mono whitespace-nowrap">148 / 180</span>
        </div>
        <Progress
          value={82}
          className="mt-3"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="success">{t("preview.confirmed")}</Badge>
          <Badge className="bg-status-waitlist-bg text-status-waitlist">
            {t("preview.waitlist")}
          </Badge>
        </div>
      </div>
      <div className="hidden w-48 rounded-lg border border-border bg-card p-4 shadow-sm md:absolute md:top-4 md:right-0 md:block md:-rotate-6">
        <p className="text-xs text-muted-foreground">{t("preview.paid")}</p>
        <p className="font-mono text-3xl font-semibold text-link">87 %</p>
      </div>
    </div>
  )
}

function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-2xl font-semibold tracking-tight md:text-4xl md:font-bold", className)}>
      {children}
    </h2>
  )
}

// Landing of the product: hero with the two entries and the catalog, event types, what Togena does, participants.
// Figma (Togena – Landing, návrh podle Waitlyst): Landing v2 Desktop 1440 · https://www.figma.com/design/g7XqI8jbKRumGK6LhIrEut?node-id=10-2
// Figma (Togena – Landing, návrh podle Waitlyst): Landing v2 Mobile 360 · https://www.figma.com/design/g7XqI8jbKRumGK6LhIrEut?node-id=12-2
function LandingPage() {
  const { t } = useTranslation("landing")

  return (
    <>
      <Seo />
      <PublicLayout
        isFullWidth
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
              <a href="#participants">{t("nav.participants")}</a>
            </Button>
          </div>
        }
        footer={
          <div
            className={cn(
              CONTENT,
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
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-x-0 -bottom-24 h-32 origin-bottom-left -skew-y-6 border-t-4 border-primary bg-accent md:h-48"
          />
          <div
            className={cn(
              CONTENT,
              "relative grid items-center gap-8 py-12 md:grid-cols-2 md:gap-12 md:py-24",
            )}
          >
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl leading-11 font-bold tracking-tight md:text-6xl md:leading-16">
                {t("title")} <span className="text-link">{t("titleAccent")}</span>
              </h1>
              <p className="max-w-lg text-muted-foreground md:text-lg">{t("description")}</p>
              <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
                <Button
                  asChild
                  size="lg"
                >
                  <Link to={ROUTES.organizer.login}>{t("organizerCta")}</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                >
                  <Link to={ROUTES.participant.login}>{t("participantCta")}</Link>
                </Button>
                <CatalogButton />
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        <section
          className={cn(CONTENT, "flex flex-col items-center gap-8 py-12 md:gap-12 md:py-24")}
        >
          <div className="flex max-w-xl flex-col items-center gap-3 text-center">
            <Heading>{t("types.title")}</Heading>
            <p className="text-muted-foreground md:text-lg">{t("types.description")}</p>
          </div>
          <div className="grid w-full gap-6 md:grid-cols-3 md:gap-8">
            {EVENT_TYPES.map(({ key, illustration }) => (
              <div
                key={key}
                className="flex flex-col items-center gap-3 text-center"
              >
                <div className="flex h-44 w-full items-center justify-center rounded-lg bg-muted p-4 md:h-56">
                  <Art
                    illustration={illustration}
                    className="h-full w-auto"
                  />
                </div>
                <h3 className="text-lg leading-6.5 font-semibold">{t(`types.${key}.title`)}</h3>
                <p className="text-muted-foreground">{t(`types.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="organizers"
          className="scroll-mt-16 border-t border-border bg-muted py-12 md:py-24"
        >
          <div className={cn(CONTENT, "flex flex-col gap-8 md:gap-12")}>
            <Heading className="text-center">{t("features.title")}</Heading>
            <div className="grid gap-4 md:grid-cols-3 md:gap-6">
              {FEATURES.map(({ key, illustration }) => (
                <Card
                  key={key}
                  className="items-center gap-4 p-6 text-center"
                >
                  <div className="flex h-40 w-full items-center justify-center rounded-md bg-background p-4">
                    <Art
                      illustration={illustration}
                      className="h-full w-auto"
                    />
                  </div>
                  <h3 className="text-lg leading-6.5 font-semibold">
                    {t(`features.${key}.title`)}
                  </h3>
                  <p className="text-muted-foreground">{t(`features.${key}.body`)}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-primary py-12 text-primary-foreground md:py-24">
          <div className={cn(CONTENT, "grid items-center gap-8 md:grid-cols-2 md:gap-16")}>
            <div className="flex flex-col items-start gap-4 md:gap-5">
              <div className="flex size-10 items-center justify-center rounded-md bg-card text-link">
                <Clock
                  aria-hidden
                  className="size-5"
                />
              </div>
              <Heading>{t("features.waitlist.title")}</Heading>
              <p className="md:text-lg">{t("features.waitlist.body")}</p>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-card text-link hover:bg-card/90"
              >
                <Link to={ROUTES.catalog}>{t("catalogLink")}</Link>
              </Button>
            </div>
            <div className="flex items-center justify-center rounded-lg bg-card p-6 shadow-md md:order-last">
              <Art
                illustration={DashboardIllustration}
                className="max-h-72"
              />
            </div>
          </div>
        </section>

        <section
          id="participants"
          className={cn(
            CONTENT,
            "flex scroll-mt-16 flex-col items-center gap-6 py-12 text-center md:py-24",
          )}
        >
          <Art
            illustration={SignUpIllustration}
            className="w-48 md:w-64"
          />
          <Heading className="max-w-3xl">{t("participants.title")}</Heading>
          <p className="max-w-xl text-muted-foreground md:text-lg">{t("participants.body")}</p>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
            <CatalogButton className="border-transparent bg-primary text-primary-foreground hover:bg-primary/90" />
            <Button
              asChild
              size="lg"
              variant="outline"
            >
              <Link to={ROUTES.participant.login}>{t("participantCta")}</Link>
            </Button>
          </div>
        </section>

        <section className="bg-primary py-12 text-primary-foreground md:py-20">
          <div className={cn(CONTENT, "grid items-center gap-8 md:grid-cols-[1fr_auto] md:gap-16")}>
            <div className="flex flex-col items-start gap-4">
              <Heading>{t("cta.title")}</Heading>
              <p className="max-w-xl md:text-lg">{t("cta.body")}</p>
              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="bg-card text-link hover:bg-card/90"
                >
                  <Link to={ROUTES.organizer.login}>{t("organizerCta")}</Link>
                </Button>
                <CatalogButton isOnPrimary />
              </div>
            </div>
            <Art
              illustration={CelebrateIllustration}
              className="w-56 md:w-72"
            />
          </div>
        </section>
      </PublicLayout>
    </>
  )
}
