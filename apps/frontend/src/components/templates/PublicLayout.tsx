import type { ReactNode } from "react"

import { Header } from "@/components/organisms/Header"
import { PublicFooter } from "@/components/organisms/PublicFooter"

type PublicLayoutProps = {
  children: ReactNode
  /** Width of the content column the header and the full footer line up with (Figma: their padding follows the page). */
  headerContentClassName?: string
  /** The footer with the brand and the link groups (landing, catalog, event page); otherwise the minimal one. */
  hasFullFooter?: boolean
  /** Full-width sections that manage their own width (landing). */
  isFullWidth?: boolean
}

/** Every public page — no login, mobile first (360 px): the public header, content and the public footer. */
export function PublicLayout({
  children,
  headerContentClassName,
  hasFullFooter = false,
  isFullWidth = false,
}: PublicLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <Header contentClassName={headerContentClassName} />
      <main className="flex-1">
        {isFullWidth ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-200 px-4 py-8">{children}</div>
        )}
      </main>
      <PublicFooter
        isMinimal={!hasFullFooter}
        contentClassName={headerContentClassName}
      />
    </div>
  )
}
