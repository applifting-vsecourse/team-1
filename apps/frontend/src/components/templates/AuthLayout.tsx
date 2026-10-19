import type { ReactNode } from "react"

import { Logo } from "@/components/atoms/Logo"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { Card } from "@/components/ui/card"

type AuthLayoutProps = {
  title: string
  description: string
  /** Heading of the form card. Without it the children sit directly on the page. */
  cardTitle?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Sign-in, set-password and 403 pages: centred logo and heading, the form in
 * one card. The header's user menu is left out — there is no user yet — but
 * the language switcher stays, because nobody can sign in in a language they
 * cannot read.
 */
// Figma (Design system): S01 Přihlášení organizátora · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11987-51
// Figma (Design system): S10 Přihlášení účastníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11968-273
export function AuthLayout({ title, description, cardTitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="min-h-svh">
      <div className="mx-auto flex w-full max-w-140 flex-col gap-12 px-4 py-8 md:py-16">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <span aria-hidden="true" />
          <Logo />
          <div className="justify-self-end">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h1 className="text-center text-4xl font-bold tracking-tight">{title}</h1>
          <p className="text-center text-muted-foreground">{description}</p>

          {cardTitle ? (
            <Card className="gap-6 rounded-lg p-8">
              <h2 className="text-2xl font-bold tracking-tight">{cardTitle}</h2>
              {children}
            </Card>
          ) : (
            children
          )}

          {footer ? <p className="text-sm text-muted-foreground">{footer}</p> : null}
        </div>
      </div>
    </main>
  )
}
