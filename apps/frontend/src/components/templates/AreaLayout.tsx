import type { ReactNode } from "react"

import { Header } from "@/components/organisms/Header"
import { cn } from "@/lib/utils"

type AreaLayoutProps = {
  nav: ReactNode
  userMenu: ReactNode
  /** `reading` for participant pages, `wide` for organizer tables. */
  width: "reading" | "wide"
  children: ReactNode
}

/**
 * Chrome of the signed-in areas. Organizer and participant layouts differ only
 * in navigation and content width, so they share this template; the route
 * layouts (`routes/organizator/_app.tsx`, `routes/ucastnik/_app.tsx`) fill the
 * slots.
 */
export function AreaLayout({ nav, userMenu, width, children }: AreaLayoutProps) {
  return (
    <>
      <Header
        nav={nav}
        userMenu={userMenu}
      />
      <main className="min-h-svh">
        <div
          className={cn(
            "mx-auto flex w-full flex-col gap-8 px-4 py-8",
            width === "reading" ? "max-w-2xl" : "max-w-4xl",
          )}
        >
          {children}
        </div>
      </main>
    </>
  )
}
