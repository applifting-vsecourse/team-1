import { Link } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { AuthLayout } from "@/components/templates/AuthLayout"
import { Button } from "@/components/ui/button"

/** 404 — a path that matches no route. */
// Figma (Design system): S20 Stránka nenalezena · 404 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14478-2208
export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <AuthLayout
      icon={
        <div className="flex size-14 items-center justify-center rounded-full bg-accent text-link">
          <Search
            aria-hidden
            className="size-6"
          />
        </div>
      }
      title={t("pages.notFound.title")}
      description={`404 · ${t("pages.notFound.description")}`}
      cardTitle={t("pages.notFound.cardTitle")}
    >
      <p>{t("pages.notFound.body")}</p>
      <div className="flex flex-col gap-5">
        <Button
          asChild
          size="lg"
          className="w-full"
        >
          <Link to={ROUTES.home}>{t("pages.notFound.action")}</Link>
        </Button>
      </div>
    </AuthLayout>
  )
}
