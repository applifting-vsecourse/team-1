import type { ReactNode } from "react"

import { Header } from "@/components/organisms/Header"
import { Card } from "@/components/ui/card"

type AuthLayoutProps = {
  title: string
  description: string
  /** Round icon above the heading (403). */
  icon?: ReactNode
  /** Heading of the form card. Without it the children sit directly on the page. */
  cardTitle?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Sign-in, set-password and 403 pages: the public header, a centred heading
 * and the content in one card. The header keeps the language switcher,
 * because nobody can sign in in a language they cannot read.
 */
// Figma (Design system): S01 Přihlášení organizátora · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11987-51
// Figma (Design system): S10 Přihlášení účastníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11968-273
// Figma (Remake): S01 Přihlášení organizátora · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=20-170
// Figma (Remake): S10 Přihlášení účastníka · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=20-360
export function AuthLayout({
  title,
  description,
  icon,
  cardTitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <>
      <Header />
      <main className="min-h-svh">
        <div className="mx-auto flex w-full max-w-110 flex-col gap-8 px-4 pt-10 pb-12 md:pt-20 md:pb-28">
          <div className="flex flex-col items-center gap-4 text-center">
            {icon}
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </div>

          {cardTitle ? (
            <Card className="gap-5 p-6">
              <h2 className="text-lg font-semibold">{cardTitle}</h2>
              {children}
            </Card>
          ) : (
            children
          )}

          {footer ? <p className="text-center text-sm text-muted-foreground">{footer}</p> : null}
        </div>
      </main>
    </>
  )
}
