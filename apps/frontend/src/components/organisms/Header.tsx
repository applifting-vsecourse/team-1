import type { ReactNode } from "react"

import { Logo } from "@/components/atoms/Logo"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/molecules/ThemeSwitcher"
import { cn } from "@/lib/utils"

type HeaderProps = {
  /** Area navigation (organizer / participant). Omitted on public pages. */
  nav?: ReactNode
  // Auth-aware menu (user dropdown). Passed as a slot so `components/`
  // doesn't have to import from `features/auth`.
  userMenu?: ReactNode
  /** Content width of the landing (1200 px) instead of the 896 px of the other public pages. */
  isWide?: boolean
}

/** Public header: logo on the left, language and theme switchers on the right. */
// Figma (Design system): V08 Veřejná hlavička · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12734-1365
export function Header({ nav, userMenu, isWide = false }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
      <div
        className={cn(
          "mx-auto flex w-full items-center gap-4 px-4 py-4",
          isWide ? "max-w-300" : "max-w-224",
        )}
      >
        <Logo />
        {nav ? <nav className="flex items-center gap-1">{nav}</nav> : null}
        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {userMenu}
        </div>
      </div>
    </header>
  )
}
