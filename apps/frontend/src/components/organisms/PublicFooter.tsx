import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Logo } from "@/components/atoms/Logo"

const LINK = "text-muted-foreground hover:text-foreground"

/** The footer of every public page: the brand and its two link groups. */
// Figma (Design system v2): Patička (veřejná) · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27421-16542 (mobile 27421-16523)
export function PublicFooter() {
  const { t } = useTranslation("common")

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-299 flex-col gap-6 px-4 py-6 md:flex-row md:justify-between md:gap-12 md:px-12 md:py-8">
        <div className="flex flex-col gap-2">
          <Logo isSmall />
          <p className="text-sm text-muted-foreground">{t("publicFooter.tagline")}</p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm md:flex md:gap-16">
          <nav
            aria-label={t("publicFooter.organizers")}
            className="flex flex-col gap-3"
          >
            <p className="font-medium">{t("publicFooter.organizers")}</p>
            <ul className="flex flex-col gap-2">
              <li>
                <Link
                  to={ROUTES.organizer.register}
                  className={LINK}
                >
                  {t("publicFooter.register")}
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.organizer.login}
                  className={LINK}
                >
                  {t("publicFooter.login")}
                </Link>
              </li>
            </ul>
          </nav>
          <nav
            aria-label={t("publicFooter.participants")}
            className="flex flex-col gap-3"
          >
            <p className="font-medium">{t("publicFooter.participants")}</p>
            <ul className="flex flex-col gap-2">
              <li>
                <Link
                  to={ROUTES.catalog}
                  className={LINK}
                >
                  {t("publicFooter.catalog")}
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.participant.login}
                  className={LINK}
                >
                  {t("publicFooter.myApplications")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
