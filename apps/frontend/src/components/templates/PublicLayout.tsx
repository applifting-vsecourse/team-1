import type { ReactNode } from "react"

import { Header } from "@/components/organisms/Header"

type PublicLayoutProps = {
  children: ReactNode
  /** Navigation links in the header (landing). */
  nav?: ReactNode
  /** Under the content, across the page (landing). */
  footer?: ReactNode
  /** Full-width sections that manage their own width (landing). */
  isFullWidth?: boolean
}

/** Landing and the application form — no login, mobile first (360 px). */
export function PublicLayout({ children, nav, footer, isFullWidth = false }: PublicLayoutProps) {
  return (
    <>
      <Header
        nav={nav}
        isWide={isFullWidth}
      />
      <main className="min-h-svh">
        {isFullWidth ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-200 px-4 py-8">{children}</div>
        )}
      </main>
      {footer ? <footer className="border-t border-border">{footer}</footer> : null}
    </>
  )
}
