import { useState, type ReactNode } from "react"
import { useRouterState } from "@tanstack/react-router"
import { Menu } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Logo } from "@/components/atoms/Logo"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/molecules/ThemeSwitcher"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

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
 * Chrome of the signed-in areas: a sidebar with the logo and the area
 * navigation, and a workspace with the top bar above the page. Below `md`
 * the sidebar moves into a sheet opened from the top bar, so the page starts
 * right under the bar. Organizer and participant layouts differ only in
 * navigation and content width, so they share this template; the route
 * layouts (`routes/organizer/_app.tsx`, `routes/participant/_app.tsx`) fill
 * the slots.
 */
// Figma (Design system): O01 Dashboard · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-2
// Figma (Design system): U13 Nastavení účtu účastníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11988-11146
// Figma (Design system): M08 Přihlášená část · navigace zavřená · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13177-1680
// Figma (Design system): M09 Přihlášená část · navigace otevřená · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13177-21759
export function AreaLayout({ nav, roleLabel, userMenu, width, children }: AreaLayoutProps) {
  const { t } = useTranslation()
  // The sheet remembers the page it was opened on, so following a link in it closes it.
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [menuOpenedOn, setMenuOpenedOn] = useState<string | null>(null)

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar px-4 pt-4 pb-6 text-sidebar-foreground md:flex">
        <div className="flex h-10 items-center pl-1">
          <Logo />
        </div>
        <nav className="flex flex-col gap-2">{nav}</nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-1 border-b border-border bg-card px-2 sm:gap-2 sm:px-4 md:static md:px-8">
          <Sheet
            open={menuOpenedOn === pathname}
            onOpenChange={(isOpen) => setMenuOpenedOn(isOpen ? pathname : null)}
          >
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="md:hidden"
                aria-label={t("nav.openMenu")}
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 gap-4 border-r-0 bg-sidebar px-4 pt-4 pb-6 text-sidebar-foreground"
            >
              <SheetTitle className="sr-only">{roleLabel}</SheetTitle>
              <div className="flex h-10 items-center pl-1">
                <Logo />
              </div>
              <nav className="flex flex-col gap-2">{nav}</nav>
            </SheetContent>
          </Sheet>
          <div className="md:hidden">
            <Logo />
          </div>
          <p className="hidden flex-1 text-xs font-medium tracking-wider text-muted-foreground uppercase md:block">
            {roleLabel}
          </p>
          <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0">
            <LanguageSwitcher />
            <ThemeSwitcher />
            {userMenu}
          </div>
        </div>
        <main className="px-4 pt-6 pb-12 md:px-8 md:pt-8">
          <div className={cn("flex w-full flex-col gap-6", width === "reading" && "max-w-196")}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
