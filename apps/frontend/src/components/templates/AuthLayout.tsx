import type { ReactNode } from "react"

import { BrandDivider } from "@/components/atoms/BrandDivider"
import { useIsEmbeddedPage } from "@/components/atoms/EmbeddedPage"
import { HeadingBand } from "@/components/atoms/HeadingBand"
import { Header } from "@/components/organisms/Header"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AuthLayoutProps = {
  title: string
  description: string
  /** Round icon above the heading (403). */
  singleCard?: boolean
  band?: boolean
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
  singleCard = false,
  band = false,
  back,
  children,
  footer,
}: AuthLayoutProps) {
  const isEmbedded = useIsEmbeddedPage()
  const heading = (
    <div className="flex flex-col items-start gap-2">
      {icon}
      <h1 className="text-2xl font-bold md:text-[32px]/10">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
  const content = (
    <div
      className={
        isEmbedded
          ? "mx-auto flex w-full max-w-128 flex-col gap-6 pt-10 pb-12"
          : cn(
              "mx-auto flex w-full max-w-128 flex-col gap-6 px-4 pb-12 md:pb-28",
              back ? "pt-4 md:pt-8" : "pt-10 md:pt-20",
            )
      }
    >
      {back}
      {singleCard ? (
        <Card className="gap-6 rounded-2xl p-6">
          {heading}
          <BrandDivider />
          {children}
          {footer}
        </Card>
      ) : (
        <>
          {band ? <HeadingBand>{heading}</HeadingBand> : heading}

          {cardTitle ? (
            <Card className="gap-5 p-6">
              <h2 className="text-lg font-semibold">{cardTitle}</h2>
              {children}
            </Card>
          ) : (
            children
          )}

          {footer ? (
            <div className="text-center text-sm text-muted-foreground">{footer}</div>
          ) : null}
        </>
      )}
    </div>
  )

  // Embedded: the area layout already provides the header and `<main>`.
  if (isEmbedded) return content

  return (
    <>
      <Header />
      <main className="relative min-h-svh overflow-hidden">
        <div className="relative">{content}</div>
      </main>
    </>
  )
}
