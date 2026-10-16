import type { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  description?: ReactNode
  /** Page-level actions, e.g. the one primary button of the view. */
  actions?: ReactNode
}

/** The single `h1` of a page with optional supporting text and actions. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
