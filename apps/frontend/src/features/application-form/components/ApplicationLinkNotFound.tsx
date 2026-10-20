import { Link } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { PublicLayout } from "@/components/templates/PublicLayout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

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
        <div className="mx-auto flex w-full max-w-110 flex-col gap-6 pt-2 md:pt-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-accent text-link">
              <TriangleAlert
                aria-hidden
                className="size-6"
              />
            </div>
            <p className="text-sm font-medium text-link">{t("notFound.code")}</p>
            <h1 className="text-3xl font-bold md:text-4xl">{t("notFound.title")}</h1>
          </div>
          <Card className="gap-5 p-6">
            <p>{t("notFound.description")}</p>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Link to={ROUTES.home}>{t("notFound.action")}</Link>
            </Button>
          </Card>
        </div>
      </PublicLayout>
    </>
  )
}
