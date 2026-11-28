import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Logo } from "@/components/atoms/Logo"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/molecules/ThemeSwitcher"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type HeaderProps = {
  /** „Přihlásit se“ on the right. Off on the sign-in and system pages. */
  hasSignIn?: boolean
  /** Another action in its place, e.g. „Odhlásit se“ in the registration wizard (a slot: `components/` never imports from `features/`). */
  action?: ReactNode
  /** Width of the page's content column the header lines up with; 1200 px by default. */
  contentClassName?: string
}

/**
 * The public header (Luma): logo, „Katalog akcí“ and „Pro organizátory“ on the left; language,
 * theme and „Přihlásit se“ on the right. On a phone only the logo and „Přihlásit se“ stay: the
 * hero entries lead on, and language and theme move to the top of the footer.
 */
// Figma (Design system v2): Togena / Navigation / Public header · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27609-4438 (desktop 27609-4370, mobile 27609-4424)
export function Header({ hasSignIn = true, action, contentClassName = "max-w-300" }: HeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card px-4 md:px-8">
      <div
        className={cn(
          "mx-auto flex h-14 w-full items-center gap-4 md:h-18 md:gap-10",
          contentClassName,
        )}
      >
        <Logo />
        <nav
          aria-label={t("nav.main")}
          className="hidden items-center gap-2 md:flex"
        >
          <Button
            asChild
            variant="ghost"
          >
            <Link to={ROUTES.catalog}>{t("publicHeader.catalog")}</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
          >
            <Link
              to={ROUTES.home}
              hash="organizers"
            >
              {t("publicHeader.organizers")}
            </Link>
          </Button>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden items-center gap-4 md:flex">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
          {action ??
            (hasSignIn ? (
              <Button
                asChild
                variant="outline"
              >
                <Link to={ROUTES.participant.login}>{t("publicHeader.signIn")}</Link>
              </Button>
            ) : null)}
        </div>
      </div>
    </header>
  )
}
