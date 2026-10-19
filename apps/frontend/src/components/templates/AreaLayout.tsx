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
 * Chrome of the signed-in areas (Figma O01, O30, U13): the area navigation
 * sits in a side column from `md` up and above the content on a phone.
 * Organizer and participant layouts differ only in navigation and content
 * width, so they share this template; the route layouts
 * (`routes/organizer/_app.tsx`, `routes/participant/_app.tsx`) fill the slots.
 */
export function AreaLayout({ nav, userMenu, width, children }: AreaLayoutProps) {
  return (
    <>
      <Header userMenu={userMenu} />
      <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-4 px-4 py-8 md:flex-row md:gap-8">
        <nav className="flex shrink-0 gap-1 md:w-48 md:flex-col">{nav}</nav>
        <main
          className={cn("flex min-w-0 flex-1 flex-col gap-8", width === "reading" && "max-w-2xl")}
        >
          {children}
        </main>
      </div>
    </>
  )
}
