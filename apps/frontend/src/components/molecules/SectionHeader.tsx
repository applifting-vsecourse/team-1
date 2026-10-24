import type { ReactNode } from "react"

type SectionHeaderProps = {
  title: string
  description?: ReactNode
  /** The section's actions, e.g. the one primary button of the view. */
  actions?: ReactNode
}

/**
 * Heading of a section under a page header that already holds the `h1`
 * (an event's tabs): `h2` with optional supporting text and actions on the right.
 */
export function SectionHeader({ title, description, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
