import { useEffect, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { EmbeddedPageContext } from "@/components/atoms/EmbeddedPage"
import { Logo } from "@/components/atoms/Logo"
import { cn } from "@/lib/utils"

type AreaLayoutProps = {
  nav: ReactNode
  /** The signed-in account at the bottom of the sidebar (a slot: `components/` never imports from `features/`). */
  account: ReactNode
  /** `reading` (800 px) for participant pages, `wide` (1200 px) for organizer tables. */
  width: "reading" | "wide"
  /** Where the logo leads; the landing page by default, which sends a signed-in user to their area's start. */
  logoTo?: string
  /** The notification bell, next to the logo. */
  notifications?: ReactNode
  /** The account menu (the avatar) in the mobile header; it also holds the navigation, so there is no drawer. */
  mobileMenu: ReactNode
  children: ReactNode
}

/**
 * Chrome of the signed-in areas (Figma F4 and F5): no top bar. The sidebar carries the logo with
 * the bell next to it, the area navigation and the account at the bottom; the page starts with its
 * own heading. Below `md` a 56 px header carries the logo, the bell and the account menu (the
 * avatar). The route layouts (`routes/organizer/_app.tsx`, `routes/participant/_app.tsx`) fill
 * the slots.
 */
// Figma (Design system v2): F4 / Navigation / Sidebar přihlašovatele · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2 (mobile header: 15649-122, account menu open: 27681-33558)
// Figma (Design system v2): F5 / Navigation / Sidebar organizátora · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15376-2 (mobile header: 15376-98, account menu open: 18471-20359)
export function AreaLayout({
  nav,
  account,
  width,
  logoTo,
  notifications,
  mobileMenu,
  children,
}: AreaLayoutProps) {
  const { t } = useTranslation()
  // The work layer (DESIGN.md, Brand layer and motion): `lift` shows its shadow without moving. On <body>,
  // so dialogs and menus portalled out of the layout follow it too.
  useEffect(() => {
    document.body.dataset.layer = "work"
    return () => {
      delete document.body.dataset.layer
    }
  }, [])

  return (
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
        <div className="mt-auto border-t border-sidebar-border pt-6">{account}</div>
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
          <div
            className={cn(
              "mx-auto flex w-full flex-col",
              width === "reading" ? "max-w-200 gap-8" : "max-w-300 gap-4 md:gap-6",
            )}
          >
            <EmbeddedPageContext.Provider value>{children}</EmbeddedPageContext.Provider>
          </div>
        </main>
      </div>
    </div>
  )
}
