import type { ReactNode } from "react"

import { BandBackdrop } from "@/components/atoms/BandBackdrop"
import { useIsEmbeddedPage } from "@/components/atoms/EmbeddedPage"
import { Header } from "@/components/organisms/Header"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AuthLayoutProps = {
  title: string
  description: string
  /** Round icon above the heading (403). */
  icon?: ReactNode
  /** Heading of the form card. Without it the children sit directly on the page. */
  cardTitle?: string
  /** Link back above the heading (sign-in pages). */
  back?: ReactNode
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
export function AuthLayout({
  title,
  description,
  icon,
  cardTitle,
  back,
  children,
  footer,
}: AuthLayoutProps) {
  const isEmbedded = useIsEmbeddedPage()
  const content = (
    <div
      className={
        isEmbedded
          ? "mx-auto flex w-full max-w-110 flex-col gap-6 pt-10 pb-12"
          : cn(
              "mx-auto flex w-full max-w-110 flex-col gap-6 px-4 pb-12 md:pb-28",
              back ? "pt-4 md:pt-8" : "pt-10 md:pt-20",
            )
      }
    >
      {back}
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

      {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  )

  // Embedded: the area layout already provides the header and `<main>`.
  if (isEmbedded) return content

  return (
    <>
      <Header />
      <main className="relative min-h-svh overflow-hidden">
        <BandBackdrop className="h-40 lg:h-56" />
        <div className="relative">{content}</div>
      </main>
    </>
  )
}
