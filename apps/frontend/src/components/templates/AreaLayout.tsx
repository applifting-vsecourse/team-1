import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Logo } from "@/components/atoms/Logo"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/molecules/ThemeSwitcher"
import { cn } from "@/lib/utils"

// Placeholder until the support channel is decided (open question in the PR).
const SUPPORT_HREF = "mailto:podpora@togena.cz"

type AreaLayoutProps = {
  nav: ReactNode
  /** Account type shown at the top of the workspace ("Organizátor", "Účastník"). */
  roleLabel: string
  userMenu: ReactNode
  /** `reading` for participant pages, `wide` (full width) for organizer tables. */
  width: "reading" | "wide"
  children: ReactNode
}

/**
 * Chrome of the signed-in areas: a sidebar with the logo, the area navigation
 * and the support link, and a workspace with the top bar above the page. On a
 * phone the sidebar sits above the workspace. Organizer and participant
 * layouts differ only in navigation and content width, so they share this
 * template; the route layouts (`routes/organizer/_app.tsx`,
 * `routes/participant/_app.tsx`) fill the slots.
 */
// Figma (Design system): O01 Dashboard · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-2
// Figma (Design system): U13 Nastavení účtu účastníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-11146
// Figma (Remake): O01 Dashboard organizátora · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=26-528
// Figma (Remake): U13 Nastavení účtu účastníka · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=28-698
export function AreaLayout({ nav, roleLabel, userMenu, width, children }: AreaLayoutProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-sidebar-border bg-sidebar px-4 pt-4 pb-6 text-sidebar-foreground md:w-60 md:border-r md:border-b-0">
        <div className="flex h-10 items-center pl-1">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1">{nav}</nav>
        <div className="mt-auto hidden flex-col gap-0.5 pl-2.5 text-sm md:flex">
          <p className="text-muted-foreground">{t("support.question")}</p>
          <a
            href={SUPPORT_HREF}
            className="font-medium text-accent-foreground underline underline-offset-4"
          >
            {t("support.link")}
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-4 md:px-8">
          <p className="flex-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {roleLabel}
          </p>
          <LanguageSwitcher />
          <ThemeSwitcher />
          {userMenu}
        </div>
        <main className="px-4 pt-8 pb-12 md:px-8">
          <div className={cn("flex w-full flex-col gap-6", width === "reading" && "max-w-196")}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
