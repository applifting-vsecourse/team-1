import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Button } from "@/components/ui/button"

// Figma (Design system): #22 Stránka nebyla nalezena · Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-24208
// Mobil · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-24268

/** An unknown event, or one whose application link does not work. */
export function EventNotFound() {
  const { t } = useTranslation("catalog")

  return (
    <>
      <Seo title={t("notFound.title")} />
      <PublicLayout isFullWidth>
        <div className="mx-auto flex w-full max-w-275 flex-col gap-4 p-4 md:p-12">
          <h1 className="text-2xl/8 font-bold tracking-tight">{t("notFound.title")}</h1>
          <p>{t("notFound.description")}</p>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="w-full"
          >
            <Link to={ROUTES.home}>{t("notFound.action")}</Link>
          </Button>
        </div>
      </PublicLayout>
    </>
  )
}
