import type { ReactNode } from "react"

import { Backdrop } from "@/components/atoms/Backdrop"
import { Header } from "@/components/organisms/Header"
import { PublicFooter } from "@/components/organisms/PublicFooter"
import { Card } from "@/components/ui/card"

type AuthLayoutProps = {
  /** The content of the one card: the heading, the form or the state, the card footer. */
  children: ReactNode
  /** In place of „Přihlásit se“ in the header, e.g. „Odhlásit se“ in the registration wizard. */
  headerAction?: ReactNode
  /** Under the card, e.g. the step dots of the registration wizard. */
  below?: ReactNode
}

/**
 * Entry pages — sign-in, magic link, set password, registration: the public header without
 * „Přihlásit se“, one brand card on the Backdrop and the minimal footer. The page's `h1` is the
 * card's heading.
 */
// Figma (Design system v2): US-02 / Přihlášení přihlašovatele · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15315-2 (mobile 15315-52)
export function AuthLayout({ children, headerAction, below }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <Header
        hasSignIn={false}
        action={headerAction}
        contentClassName="max-w-224"
      />
      <div className="relative flex flex-1 flex-col">
        <Backdrop />
        <main className="relative flex flex-1 flex-col items-center gap-4 px-4 pt-6 pb-12 md:px-6 md:pt-16">
          <Card className="w-full max-w-110 gap-4 p-6">{children}</Card>
          {below}
        </main>
        <PublicFooter isMinimal />
      </div>
    </div>
  )
}
