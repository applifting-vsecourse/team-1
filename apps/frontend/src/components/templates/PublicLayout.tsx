import type { ReactNode } from "react"

import { Header } from "@/components/organisms/Header"

type PublicLayoutProps = {
  children: ReactNode
  /** One line under the content, across the page (landing). */
  footer?: ReactNode
  /** Full-width sections that manage their own width (landing). */
  isFullWidth?: boolean
}

/** Landing and the application form — no login, mobile first (360 px). */
export function PublicLayout({ children, footer, isFullWidth = false }: PublicLayoutProps) {
  return (
    <>
      <Header />
      <main className="min-h-svh">
        {isFullWidth ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-200 px-4 py-8">{children}</div>
        )}
      </main>
      {footer ? (
        <footer className="border-t border-border p-6">
          <p className="text-center text-sm text-muted-foreground">{footer}</p>
        </footer>
      ) : null}
    </>
  )
}
