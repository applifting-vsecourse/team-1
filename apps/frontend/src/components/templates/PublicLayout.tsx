import type { ReactNode } from "react"

import { Header } from "@/components/organisms/Header"
import { PublicFooter } from "@/components/organisms/PublicFooter"

type PublicLayoutProps = {
  children: ReactNode
  /** Navigation links in the header (landing). */
  nav?: ReactNode
  headerAction?: ReactNode
  headerContentClassName?: string
  /** The page has a fixed bar at the bottom on mobile; keeps the footer clear of it. */
  hasBottomBar?: boolean
  /** Full-width sections that manage their own width (landing). */
  isFullWidth?: boolean
}

/** Every public page — no login, mobile first (360 px); header, content and the public footer. */
export function PublicLayout({
  children,
  nav,
  headerAction,
  headerContentClassName,
  hasBottomBar = false,
  isFullWidth = false,
}: PublicLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <Header
        nav={nav}
        userMenu={headerAction}
        contentClassName={headerContentClassName}
        isWide={isFullWidth}
      />
      <main className="flex-1">
        {isFullWidth ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-200 px-4 py-8">{children}</div>
        )}
      </main>
      <PublicFooter />
      {hasBottomBar ? (
        <div
          aria-hidden
          className="h-20 md:hidden"
        />
      ) : null}
    </div>
  )
}
