import type { ReactNode } from "react"

import { Logo } from "@/components/atoms/Logo"
import { LanguageSwitcher } from "@/components/molecules/LanguageSwitcher"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type AuthLayoutProps = {
  title: string
  description: string
  /** Heading of the form card. Without it the children sit directly on the page. */
  cardTitle?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Sign-in and set-password pages (Figma S01, S10): centred logo and heading,
 * the form in one card. The header's user menu is left out — there is no user
 * yet — but the language switcher stays, because nobody can sign in in a
 * language they cannot read.
 */
export function AuthLayout({ title, description, cardTitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="min-h-svh">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <span aria-hidden="true" />
          <Logo />
          <div className="justify-self-end">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {cardTitle ? (
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-lg tracking-tight">{cardTitle}</CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        ) : (
          children
        )}

        {footer ? <p className="text-sm text-muted-foreground">{footer}</p> : null}
      </div>
    </main>
  )
}
