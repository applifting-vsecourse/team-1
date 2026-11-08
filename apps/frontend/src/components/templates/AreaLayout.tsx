import { useEffect, useState, type ReactNode } from "react"
import { useRouterState } from "@tanstack/react-router"
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useTranslation } from "react-i18next"

import { EmbeddedPageContext } from "@/components/atoms/EmbeddedPage"
import { Logo } from "@/components/atoms/Logo"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/molecules/ThemeSwitcher"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type AreaLayoutProps = {
  nav: ReactNode
  /** Account type shown at the top of the workspace ("Organizátor", "Účastník"). */
  roleLabel: string
  /** The signed-in account at the bottom of the sidebar and the drawer (a slot: `components/` never imports from `features/`). */
  account: ReactNode
  /** `reading` for participant pages, `wide` (1200 px) for organizer tables. */
  width: "reading" | "wide"
  /** The notification bell, shown before the language switcher. */
  notifications?: ReactNode
  children: ReactNode
}

/**
 * Chrome of the signed-in areas: a sidebar with the logo, the area
 * navigation and the account at the bottom, and a workspace with the top bar
 * above the page. The bar carries the role label, language and theme. Below
 * `md` the sidebar moves into a sheet opened from the bar (the account stays
 * at its bottom), so the page starts right under the 56 px bar: menu, logo,
 * language and theme. Organizer and participant layouts differ only in
 * navigation and content width, so they share this template; the route
 * layouts (`routes/organizer/_app.tsx`, `routes/participant/_app.tsx`) fill
 * the slots.
 */
// Figma (Design system): N1 Akce · pozornost nahoře (bez dashboardu) / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14178-12714
// Figma (Design system): N2 Účtové menu v sidebaru otevřené / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14178-12778
// Figma (Design system): N6 Mobil · Akce s přepínači v liště · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14178-43128
// Figma (Design system): N7 Mobil · drawer s účtem · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14178-43178
// Figma (Design system): N / Mobile top bar · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14179-968
// Figma (Design system): Collapsed sidebar · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14198-44366
// Figma (Design system): HF / 10 #383 Rozbalený panel · Desktop (návrh #383) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=21905-16083
// Figma (Design system): HF / 10 #383 Sbalený panel · Desktop (návrh #383) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=21905-16181
// Figma (Design system): HF / 10 #383 Stavy ovladače · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=21905-16381
export function AreaLayout({
  nav,
  roleLabel,
  account,
  width,
  notifications,
  children,
}: AreaLayoutProps) {
  const { t } = useTranslation()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("togena.sidebar.collapsed") === "true"
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem("togena.sidebar.collapsed", String(isSidebarCollapsed))
    } catch {
      // Navigation remains usable when browser storage is unavailable.
    }
  }, [isSidebarCollapsed])
  // Ctrl/Cmd + B toggles the sidebar, except while typing (the browser or editor owns the key there)
  // and below `md`, where the sidebar is a sheet and has no collapse state to show.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "b" || !(event.ctrlKey || event.metaKey)) return
      if (event.altKey || event.shiftKey || event.defaultPrevented) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select, [contenteditable]"))
      ) {
        return
      }
      if (window.matchMedia?.("(min-width: 768px)").matches === false) return
      event.preventDefault()
      setIsSidebarCollapsed((isCollapsed) => !isCollapsed)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
  const toggleLabel = t(isSidebarCollapsed ? "nav.expandPanel" : "nav.collapsePanel")
  // The sheet remembers the page it was opened on, so following a link in it closes it.
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [menuOpenedOn, setMenuOpenedOn] = useState<string | null>(null)

  return (
    <div className="flex min-h-svh">
      <aside
        aria-label={t("nav.main")}
        data-collapsed={isSidebarCollapsed}
        className={cn(
          "group/sidebar sticky top-0 hidden h-svh shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar px-4 pt-4 pb-6 text-sidebar-foreground transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex",
          isSidebarCollapsed ? "w-20" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex shrink-0",
            isSidebarCollapsed
              ? "flex-col items-center gap-2"
              : "h-10 items-center justify-between pl-1",
          )}
        >
          <div className={cn("flex items-center", isSidebarCollapsed && "h-10")}>
            <Logo isCompact={isSidebarCollapsed} />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label={toggleLabel}
                  aria-expanded={!isSidebarCollapsed}
                  aria-controls="desktop-navigation"
                  onClick={() => setIsSidebarCollapsed((isCollapsed) => !isCollapsed)}
                >
                  {isSidebarCollapsed ? (
                    <PanelLeftOpen
                      className="size-5"
                      aria-hidden="true"
                    />
                  ) : (
                    <PanelLeftClose
                      className="size-5"
                      aria-hidden="true"
                    />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{toggleLabel}</span>
                  <span className="text-background/70">{t("nav.collapseShortcut")}</span>
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <nav
          id="desktop-navigation"
          className="flex flex-col gap-2"
        >
          {nav}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <div className="border-t border-sidebar-border pt-2">{account}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-card px-2 sm:gap-2 sm:px-4 md:static md:h-16 md:px-8">
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
              <div className="mt-auto border-t border-sidebar-border pt-2">{account}</div>
            </SheetContent>
          </Sheet>
          <div className="md:hidden">
            <Logo />
          </div>
          <p className="hidden flex-1 text-xs font-medium tracking-wider text-muted-foreground uppercase md:block">
            {roleLabel}
          </p>
          <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-2">
            {notifications}
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
        <main className="px-4 pt-6 pb-12 md:px-8 md:pt-8">
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
