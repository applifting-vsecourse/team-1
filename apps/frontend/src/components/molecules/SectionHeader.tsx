import type { ReactNode } from "react"

type SectionHeaderProps = {
  title: string
  description?: ReactNode
  /** The section's actions, e.g. the one primary button of the view. */
  actions?: ReactNode
  /**
   * An event section under its tabs: the selected tab already names it, so the `h2` is only for
   * screen readers and the actions stand right-aligned on their own row (DESIGN.md, event header).
   */
  isTitleHidden?: boolean
}

/**
 * Heading of a section under a page header that already holds the `h1`
 * (an event's tabs): `h2` with optional supporting text and actions on the right.
 */
export function SectionHeader({ title, description, actions, isTitleHidden }: SectionHeaderProps) {
  const actionsRow = actions ? (
    <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:*:flex-1">{actions}</div>
  ) : null

  if (isTitleHidden) {
    // Without actions only the hidden `h2` is left; it takes no row (and no gap) in the page column.
    // Paper has no tabs, so a printed section keeps its name.
    const heading = (
      <h2 className="sr-only print:not-sr-only print:text-2xl print:font-bold">{title}</h2>
    )
    return actionsRow ? (
      <div className="flex justify-end">
        {heading}
        {actionsRow}
      </div>
    ) : (
      heading
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-2xl font-bold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actionsRow}
    </div>
  )
}
