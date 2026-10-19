import type { ReactNode } from "react"

import { Logo } from "@/components/atoms/Logo"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { ThemeSwitcher } from "@/components/molecules/ThemeSwitcher"

type HeaderProps = {
  /** Area navigation (organizer / participant). Omitted on public pages. */
  nav?: ReactNode
  // Auth-aware menu (user dropdown). Passed as a slot so `components/`
  // doesn't have to import from `features/auth`.
  userMenu?: ReactNode
}

/** Public header: logo on the left, language and theme switchers on the right. */
// Figma (Remake): Public header · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=2-36
export function Header({ nav, userMenu }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-4">
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
