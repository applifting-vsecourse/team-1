import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Button } from "@/components/ui/button"

// Both entries have the same size (Figma: the primary is 157 px wide); on mobile they span the width.
const BUTTON_WIDTH = "sm:min-w-40 sm:self-start"

/** The two entries of the landing, repeated 1:1 in the hero and the closing section. */
export function LandingCtas() {
  const { t } = useTranslation("landing")

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <Button
        asChild
        size="lg"
        className={BUTTON_WIDTH}
      >
        <Link to={ROUTES.organizer.register}>{t("createEvent")}</Link>
      </Button>
      <div className="flex flex-col gap-2">
        <Button
          asChild
          size="lg"
          variant="outline"
          className={BUTTON_WIDTH}
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
