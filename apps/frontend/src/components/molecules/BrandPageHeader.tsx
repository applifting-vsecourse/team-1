import type { ReactNode } from "react"

import Camp from "@/assets/illustrations/camp.svg?react"
import { BrandDivider } from "@/components/atoms/BrandDivider"
import { cn } from "@/lib/utils"

type BrandPageHeaderProps = {
  title: ReactNode
  /** One line under the title (the event and the application code). */
  description?: ReactNode
  /** The way back above the title (`BackLink`). */
  back?: ReactNode
  /** The page's own controls: at the right from `md`, full width under the title on a phone. */
  actions?: ReactNode
  /** The list draws the illustration right after the title; elsewhere it stands at the right (Figma F4). */
  isIllustrationBesideTitle?: boolean
  /** Off on organizer screens, which carry no illustrations (DESIGN.md, brand layer). */
  hasIllustration?: boolean
}

/**
 * The head of a participant page: the H1, the small arc illustration (from `md`), the page's
 * controls at the right and the orange BrandDivider under it (system B). No band and no top bar
 * repeating the title.
 */
// Figma (Design system v2): brand-slot · page header · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27722-32859 (detail: 27649-35062)
export function BrandPageHeader({
  title,
  description,
  back,
  actions,
  isIllustrationBesideTitle = false,
  hasIllustration = true,
}: BrandPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      {back ? <div className="pb-1">{back}</div> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div
          className={cn("flex min-w-0 items-center gap-4", !isIllustrationBesideTitle && "flex-1")}
        >
          <div
            className={cn("flex min-w-0 flex-col gap-1", !isIllustrationBesideTitle && "flex-1")}
          >
            <h1 className="text-2xl font-bold break-words md:text-[32px]/10">{title}</h1>
            {description ? (
              <p className="text-sm text-muted-foreground md:text-base">{description}</p>
            ) : null}
          </div>
          {hasIllustration ? <Camp className="hidden h-22.5 w-30 shrink-0 md:block" /> : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 *:w-full md:ml-auto md:w-auto md:*:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
      <BrandDivider />
    </header>
  )
}
