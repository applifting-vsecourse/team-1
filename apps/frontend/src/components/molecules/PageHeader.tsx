import type { ReactNode } from "react"

import { HeadingBand, type HeadingMotif } from "@/components/atoms/HeadingBand"

type PageHeaderProps = {
  title: string
  description?: ReactNode
  /** Page-level actions, e.g. the one primary button of the view. */
  band?: boolean
  motif?: HeadingMotif
  actions?: ReactNode
}

/** The single `h1` of a page (Figma: DS / H1) with optional supporting text and actions on the right. */
export function PageHeader({ title, description, actions, band, motif }: PageHeaderProps) {
  const content = (
    <div className="flex flex-col gap-x-6 gap-y-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h1 className="text-2xl font-bold break-words md:text-[32px]/10">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 max-sm:*:flex-1">{actions}</div>
      ) : null}
    </div>
  )
  return band ? <HeadingBand motif={motif}>{content}</HeadingBand> : content
}
