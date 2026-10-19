import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Button } from "@/components/ui/button"

// Figma (Design system): invalid application link
// M05 https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-20429
// V07h https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-4236

/** An unknown application link — or an event not open for applications yet. */
export function ApplicationLinkNotFound() {
  const { t } = useTranslation("applicationForm")

  return (
    <>
      <Seo title={t("notFound.title")} />
      <PublicLayout>
        <div className="flex flex-col gap-6">
          <p className="text-6xl font-extrabold text-primary">{t("notFound.code")}</p>
          <h1 className="text-2xl font-bold tracking-tight">{t("notFound.title")}</h1>
          <p className="text-base text-muted-foreground">{t("notFound.description")}</p>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto sm:self-start"
          >
            <Link to={ROUTES.home}>{t("notFound.action")}</Link>
          </Button>
        </div>
      </PublicLayout>
    </>
  )
}
