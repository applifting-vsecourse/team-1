import type { ReactNode } from "react"

import { LogoSymbol } from "@/components/atoms/Logo"

type EmptyStateProps = {
  /** One sentence saying what would appear here. */
  message: string
  action?: ReactNode
}

// Figma (Design system v2): Togena / Feedback / Empty state · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15207-1977
// Motion M10: the symbol nudges once (120 ms); the message is readable from the start.
export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <LogoSymbol className="empty-state-symbol size-14 text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}
