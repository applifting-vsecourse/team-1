import type { ReactNode } from "react"

type EmptyStateProps = {
  /** One sentence saying what would appear here. */
  message: string
  action?: ReactNode
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}
