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

export function Header({ nav, userMenu }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-4 px-4">
        <Logo />
        {nav ? <nav className="flex items-center gap-1">{nav}</nav> : null}
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {userMenu}
        </div>
      </div>
    </header>
  )
}
