import { Link } from "@tanstack/react-router"
import { CalendarX2, House } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Button } from "@/components/ui/button"

// Figma (Design system): #22 Stránka nebyla nalezena · Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-24208
// Mobil · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-24268
// Centred with an icon tile and a primary button on request (see the PR, "Odchylky od Figmy").

/** An unknown event, or one whose application link does not work. */
export function EventNotFound() {
  const { t } = useTranslation("catalog")

  return (
    <>
      <Seo title={t("notFound.title")} />
      <PublicLayout isFullWidth>
        <div className="mx-auto flex w-full max-w-110 flex-col items-center gap-6 px-4 pt-12 pb-16 text-center md:pt-24 md:pb-32">
          <div className="flex size-16 items-center justify-center rounded-full bg-accent text-link">
            <CalendarX2
              aria-hidden
              className="size-8"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("notFound.title")}</h1>
            <p className="text-muted-foreground">{t("notFound.description")}</p>
          </div>
          <Button
            asChild
            size="lg"
            className="w-full sm:w-fit"
          >
            <Link to={ROUTES.home}>
              <House aria-hidden />
              {t("notFound.action")}
            </Link>
          </Button>
        </div>
      </PublicLayout>
    </>
  )
}
