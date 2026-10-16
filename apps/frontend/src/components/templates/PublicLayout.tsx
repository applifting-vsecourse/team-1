import type { ReactNode } from "react"

import { Header } from "@/components/organisms/Header"

type PublicLayoutProps = {
  children: ReactNode
}

/** Landing and the application form — no login, mobile first (360 px). */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <Header />
      <main className="min-h-svh">
        <div className="mx-auto w-full max-w-2xl px-4 py-8">{children}</div>
      </main>
    </>
  )
}
