import type { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  description?: ReactNode
  /** Page-level actions, e.g. the one primary button of the view. */
  actions?: ReactNode
}

/** The single `h1` of a page (Figma: DS / H1) with optional supporting text and actions on the right. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
