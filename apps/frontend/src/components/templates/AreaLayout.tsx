import { useEffect, useState, type ReactNode } from "react"
import { useRouterState } from "@tanstack/react-router"
import { Menu } from "lucide-react"
import { useTranslation } from "react-i18next"

import { EmbeddedPageContext } from "@/components/atoms/EmbeddedPage"
import { Logo } from "@/components/atoms/Logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type AreaLayoutProps = {
  nav: ReactNode
  /** Account type shown at the top of the workspace ("Organizátor", "Účastník"). */
  roleLabel: string
  /** Where the page is ("Alpine Collective / Letní kemp Lipno 2027"); the desktop top bar shows it in place of the role label. */
  context?: string
  /** The signed-in account at the bottom of the sidebar and the drawer (a slot: `components/` never imports from `features/`). */
  account: ReactNode
  /** `reading` for participant pages, `wide` (1200 px) for organizer tables; with `mobileMenu` the column is 800 px. */
  width: "reading" | "wide"
  /** Where the logo leads; the landing page by default, which sends a signed-in user to their area's start. */
  logoTo?: string
  /** The notification bell, the only control at the right of the top bar. */
  notifications?: ReactNode
  /**
   * The participant area (Figma F4) has no top bar: the bell sits next to the logo in the sidebar,
   * and below `md` a 56 px header carries the logo, the bell and this account menu (the avatar),
   * which also holds the navigation, so there is no drawer.
   */
  mobileMenu?: ReactNode
  children: ReactNode
}

/**
 * Chrome of the signed-in areas: a sidebar with the logo, the area
 * navigation and the account at the bottom, and a workspace with the top bar
 * above the page. The bar carries the role label and the notification bell;
 * language and theme also live with the sidebar account. Below `md` the sidebar
 * moves into a sheet opened from the bar (the account stays at its bottom),
 * so the page starts right under the 56 px bar: menu, logo and the bell. With
 * `mobileMenu` (the participant area) there is no top bar and no drawer: the
 * bell sits next to the logo and the content is one centred column. The route
 * layouts (`routes/organizer/_app.tsx`, `routes/participant/_app.tsx`) fill
 * the slots.
 */
// Figma v2: organizer workspace and mobile navigation · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=23441-97050 (mobile 23445-99644)
export function AreaLayout({
  nav,
  roleLabel,
  context,
  account,
  width,
  logoTo,
  notifications,
  mobileMenu,
  children,
}: AreaLayoutProps) {
  const { t } = useTranslation()
  // The sheet remembers the page it was opened on, so following a link in it closes it.
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [menuOpenedOn, setMenuOpenedOn] = useState<string | null>(null)
  // The work layer (DESIGN.md, Brand layer and motion): `lift` shows its shadow without moving. On <body>,
  // so dialogs and menus portalled out of the layout follow it too.
  useEffect(() => {
    document.body.dataset.layer = "work"
    return () => {
      delete document.body.dataset.layer
    }
  }, [])

  if (mobileMenu) {
    return (
      // Figma (Design system v2): F4 / Navigation / Sidebar přihlašovatele · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2 (mobile header: 15649-122, account menu open: 27681-33558)
      <div className="flex min-h-svh">
        <aside
          aria-label={t("nav.main")}
          className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:flex"
        >
          <div className="flex items-center justify-between gap-2">
            <Logo to={logoTo} />
            {notifications}
          </div>
          <nav className="flex flex-col gap-2">{nav}</nav>
          <div className="mt-auto border-t border-sidebar-border pt-4">{account}</div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-1 border-b border-border bg-card px-4 md:hidden">
            <Logo to={logoTo} />
            <div className="flex items-center gap-1">
              {notifications}
              {mobileMenu}
            </div>
          </header>
          <main className="min-w-0 px-4 pt-6 pb-12 md:px-8 md:pt-8">
            <div className="mx-auto flex w-full max-w-200 flex-col gap-8">
              <EmbeddedPageContext.Provider value>{children}</EmbeddedPageContext.Provider>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh">
      <aside
        aria-label={t("nav.main")}
        className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:flex"
      >
        <Logo to={logoTo} />
        <nav className="flex flex-col gap-2">{nav}</nav>
        <div className="mt-auto">{account}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-card px-4 md:h-19 md:px-(--workspace-inset)">
          <div className="md:hidden">
            <Logo to={logoTo} />
          </div>
          <p className="hidden min-w-0 flex-1 truncate text-base font-medium md:block">
            {context ?? roleLabel}
          </p>
          <div className="ml-auto flex items-center gap-1">{notifications}</div>
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
              className="w-72 gap-6 overflow-y-auto border-r-0 bg-sidebar px-4 pt-4 pb-6 text-sidebar-foreground"
            >
              <SheetTitle className="sr-only">{roleLabel}</SheetTitle>
              <div className="flex h-10 items-center pl-1">
                <Logo to={logoTo} />
              </div>
              <nav className="flex flex-col gap-2">{nav}</nav>
              <div className="mt-auto">{account}</div>
            </SheetContent>
          </Sheet>
        </div>
        <main className="min-w-0 px-(--workspace-inset) pt-6 pb-12 md:pt-8">
          <div
            className={cn(
              "mx-auto flex w-full flex-col gap-6",
              width === "reading" ? "max-w-196" : "max-w-300",
            )}
          >
            <EmbeddedPageContext.Provider value>{children}</EmbeddedPageContext.Provider>
          </div>
        </main>
      </div>
    </div>
  )
}
