import type { ReactNode } from "react"

import Camp from "@/assets/illustrations/camp.svg?react"
import { BrandDivider } from "@/components/atoms/BrandDivider"

type BrandPageHeaderProps = {
  title: ReactNode
  /** One line under the title (the event and the application code). */
  description?: ReactNode
  /** The way back above the title (`BackLink`). */
  back?: ReactNode
  /** The page's own controls at the right: the view tabs, the edit button. */
  actions?: ReactNode
}

/**
 * The head of a participant page: the H1 with the small arc illustration beside it (from `md`),
 * the page's controls at the right and the orange BrandDivider under it (system B). No band and no
 * top bar repeating the title.
 */
// Figma (Design system v2): brand-slot · page header · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27722-32859 (detail: 27649-35062)
export function BrandPageHeader({ title, description, back, actions }: BrandPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      {back ? <div className="pb-1">{back}</div> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-bold break-words md:text-[32px]/10">{title}</h1>
            {description ? <p className="text-muted-foreground">{description}</p> : null}
          </div>
          <Camp className="hidden h-22.5 w-30 shrink-0 md:block" />
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 md:ml-auto">{actions}</div>
        ) : null}
      </div>
      <BrandDivider />
    </header>
  )
}
