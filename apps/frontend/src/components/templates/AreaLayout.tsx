import type { ReactNode } from "react"

import { Logo } from "@/components/atoms/Logo"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/molecules/ThemeSwitcher"
import { cn } from "@/lib/utils"

type AreaLayoutProps = {
  nav: ReactNode
  /** Account type shown at the top of the workspace ("Organizátor", "Účastník"). */
  roleLabel: string
  userMenu: ReactNode
  /** `reading` for participant pages, `wide` for organizer tables. */
  width: "reading" | "wide"
  children: ReactNode
}

/**
 * Chrome of the signed-in areas: a sidebar with the logo and the area
 * navigation, and a workspace with the account bar above the page. On a phone
 * the sidebar sits above the workspace. Organizer and participant layouts
 * differ only in navigation and content width, so they share this template;
 * the route layouts (`routes/organizer/_app.tsx`, `routes/participant/_app.tsx`)
 * fill the slots.
 */
// Figma (Design system): O01 Dashboard · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-2
// Figma (Design system): U13 Nastavení účtu účastníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-11146
export function AreaLayout({ nav, roleLabel, userMenu, width, children }: AreaLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 bg-secondary p-4 md:w-60">
        <Logo />
        <nav className="flex flex-col gap-6">{nav}</nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-8 p-4 md:p-8">
        <div className="flex min-h-11 items-center gap-2">
          <p className="flex-1 text-xs font-medium text-muted-foreground uppercase">{roleLabel}</p>
          <LanguageSwitcher />
          <ThemeSwitcher />
          {userMenu}
        </div>
        <main
          className={cn(
            "flex w-full flex-col gap-8",
            width === "reading" ? "max-w-196" : "max-w-6xl",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
