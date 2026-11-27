import type { ReactNode } from "react"

import wideMobileBand from "@/assets/status/band-mobile-390.svg"
import mobileBand from "@/assets/status/band-mobile.svg"
import band from "@/assets/status/band.svg"
import forbiddenMark from "@/assets/status/forbidden-mark.svg"
import mobileMark from "@/assets/status/mark-mobile.svg"
import mark from "@/assets/status/mark.svg"
import { BrandDivider } from "@/components/atoms/BrandDivider"
import { useIsEmbeddedPage } from "@/components/atoms/EmbeddedPage"
import { Header } from "@/components/organisms/Header"
import { PublicFooter } from "@/components/organisms/PublicFooter"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Props = {
  title: string
  description: string
  code?: 403 | 404
  variant?: "band" | "divider" | "compact"
  children: ReactNode
}

/**
 * The previous system-page design, still used by `ApplicationLinkNotFound` and `EventNotFound`,
 * whose features belong to the catalog and application-form design passes (#795). They move to
 * `NotFoundPage` / `SystemPageLayout` when main (with #795) is merged in; then this file and
 * `assets/status` go. New system pages use `SystemPageLayout`.
 */
// Figma: #126 system errors, desktop and mobile · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20125-1810
export function SystemStatusLayout({
  title,
  description,
  code,
  variant = "band",
  children,
}: Props) {
  const isEmbedded = useIsEmbeddedPage()
  const isCompact = variant === "compact"
  const content = (
    <Card
      className={cn(
        "mx-auto w-full max-w-160 gap-6 rounded-2xl p-6 shadow-none md:p-8",
        isCompact && "max-w-120 gap-4",
      )}
    >
      <div
        className={cn(
          "relative flex flex-col gap-6 overflow-hidden",
          isCompact && "gap-4 pb-2",
          variant === "band" && "pb-10.5 md:pb-20.5",
          variant === "divider" && "pb-9",
        )}
      >
        <picture className="mx-auto">
          {code !== 403 && (
            <source
              media="(max-width: 47.999rem)"
              srcSet={mobileMark}
            />
          )}
          <img
            src={code === 403 ? forbiddenMark : mark}
            alt=""
          />
        </picture>
        {code && <p className={cn("text-sm", code === 403 && "text-muted-foreground")}>{code}</p>}
        <h1 className="text-2xl leading-8 font-bold tracking-normal md:text-[2rem] md:leading-10">
          {title}
        </h1>
        <p>{description}</p>
        {variant === "band" && (
          <picture className="pointer-events-none absolute inset-x-0 bottom-0">
            <source
              media="(min-width: 48rem)"
              srcSet={band}
            />
            <source
              media="(min-width: 24rem)"
              srcSet={wideMobileBand}
            />
            <img
              src={mobileBand}
              className="h-[30px] w-full md:h-[70px]"
              alt=""
            />
          </picture>
        )}
        {variant === "divider" && <BrandDivider className="absolute inset-x-0 bottom-0" />}
      </div>
      {children}
    </Card>
  )

  if (isEmbedded) return <div className="py-4 md:py-12">{content}</div>

  return (
    <div className="flex min-h-svh flex-col">
      <Header
        hasSignIn={code !== 403}
        contentClassName="max-w-224"
      />
      <main className={cn("flex flex-1 items-center p-4 md:p-12", isCompact && "items-start px-6")}>
        {content}
      </main>
      <PublicFooter isMinimal />
    </div>
  )
}
