import type { ReactNode } from "react"

import { Header } from "@/components/organisms/Header"

type PublicLayoutProps = {
  children: ReactNode
  /** One line under the content, across the page (landing). */
  footer?: ReactNode
}

/** Landing and the application form — no login, mobile first (360 px). */
export function PublicLayout({ children, footer }: PublicLayoutProps) {
  return (
    <>
      <Header />
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-200 px-4 py-8">{children}</div>
      </main>
      {footer ? (
        <footer className="border-t border-border py-4 md:py-6">
          <p className="mx-auto w-full max-w-200 px-4 text-sm text-muted-foreground">{footer}</p>
        </footer>
      ) : null}
    </>
  )
}
