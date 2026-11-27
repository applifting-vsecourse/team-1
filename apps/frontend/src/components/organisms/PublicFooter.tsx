import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Logo } from "@/components/atoms/Logo"
import { PreferencesRow } from "@/components/molecules/PreferencesRow"
import { cn } from "@/lib/utils"

const LINK = "text-muted-foreground hover:text-foreground"

/**
 * The footer of every public page. On a phone it starts with the language and theme row: the
 * header keeps only the logo and „Přihlásit se“ there. The full footer (landing, catalog, event
 * page) adds the brand and the two link groups; the minimal one (sign-in, system pages, the
 * application form) only the signature.
 */
// Figma (Design system v2): Patička (veřejná) · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27427-16472 (minimal: US-02 / Přihlášení přihlašovatele / Mobil 15315-52)
export function PublicFooter({
  isMinimal = false,
  contentClassName = "max-w-300",
}: {
  isMinimal?: boolean
  /** Width of the content column, the same as the header's, so both line up (landing 1200, catalog 1100). */
  contentClassName?: string
}) {
  const { t } = useTranslation()

  if (isMinimal) {
    return (
      <footer className="relative max-md:border-t max-md:border-border max-md:bg-card">
        <div className="px-4 pt-4 md:hidden">
          <PreferencesRow />
        </div>
        <p className="p-4 text-center text-sm text-muted-foreground">
          {t("publicFooter.signature")}
        </p>
      </footer>
    )
  }

  return (
    <footer className="border-t border-border bg-card px-4 py-6 md:px-8 md:py-8">
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-6 md:flex-row md:justify-between md:gap-12",
          contentClassName,
        )}
      >
        <div className="md:hidden">
          <PreferencesRow />
        </div>
        <div className="flex flex-col gap-2">
          <Logo isSmall />
          <p className="text-sm text-muted-foreground">{t("publicFooter.tagline")}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm md:flex md:gap-16">
          <FooterGroup
            title={t("publicFooter.organizers")}
            links={[
              { to: ROUTES.organizer.register, label: t("publicFooter.register") },
              { to: ROUTES.organizer.login, label: t("publicFooter.login") },
            ]}
          />
          <FooterGroup
            title={t("publicFooter.participants")}
            links={[
              { to: ROUTES.catalog, label: t("publicFooter.catalog") },
              { to: ROUTES.participant.login, label: t("publicFooter.login") },
            ]}
          />
        </div>
      </div>
    </footer>
  )
}

function FooterGroup({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <nav
      aria-label={title}
      className="flex flex-col gap-3"
    >
      <p className="font-medium">{title}</p>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className={LINK}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
