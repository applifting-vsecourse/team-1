import { useEffect } from "react"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/templates/AuthLayout"
import { Button } from "@/components/ui/button"

type ErrorPageProps = {
  /** Only logged, never shown: the visitor gets a plain explanation, not a technical message. */
  error: unknown
}

/**
 * "Something went wrong". Also the fallback of the top-level error boundary, so it must render
 * without router context: the home action is a plain link (a full page load, which is fine here).
 */
// Figma (Design system): S19 Něco se pokazilo · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14478-2158
export function ErrorPage({ error }: ErrorPageProps) {
  const { t } = useTranslation()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <AuthLayout
      icon={
        <div className="flex size-14 items-center justify-center rounded-full bg-accent text-link">
          <TriangleAlert
            aria-hidden
            className="size-6"
          />
        </div>
      }
      title={t("pages.error.title")}
      description={t("pages.error.description")}
      cardTitle={t("pages.error.cardTitle")}
    >
      <p className="text-muted-foreground">{t("pages.error.body")}</p>
      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          className="w-full"
          onClick={() => window.location.reload()}
        >
          {t("pages.error.action")}
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="w-full"
        >
          <a href={ROUTES.home}>{t("pages.error.homeAction")}</a>
        </Button>
      </div>
    </AuthLayout>
  )
}
