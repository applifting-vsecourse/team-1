import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

/** The two entries of the landing, repeated 1:1 in the hero and the closing section. */
export function LandingCtas() {
  const { t } = useTranslation("landing")

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <Button
        asChild
        size="lg"
      >
        <Link to={ROUTES.organizer.login}>{t("createEvent")}</Link>
      </Button>
      <div className="flex flex-col gap-2">
        <Button
          asChild
          size="lg"
          variant="outline"
        >
          <Link to={ROUTES.catalog}>
            {t("findEvent")}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">{t("noSignUp")}</p>
      </div>
    </div>
  )
}
