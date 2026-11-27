import type { ReactNode } from "react"

import { LogoSymbol } from "@/components/atoms/Logo"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
  /** One sentence saying what would appear here. Optional when a title already says it. */
  message?: string
  /** A heading above the message — the whole text of a state that has no message. */
  title?: string
  /** `h1` when the state is the whole page (a link that does not work). */
  titleAs?: "h1" | "h2"
  /** A brand illustration from `assets/illustrations` instead of the logo symbol (public pages and system pages only). */
  illustration?: ReactNode
  /** One action: the retry of an error, the way out of a dead end. */
  action?: ReactNode
  role?: "alert" | "status"
  className?: string
}

// Figma (Design system v2): Togena / Feedback / Empty state · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15207-1977
// With an illustration: public catalog empty 27422:16549 / 27422:16581, error 27422:16611 / 27422:16644, link not found 27426:16460 / 27426:16493.
// Motion M10: the symbol nudges once (120 ms); the message is readable from the start.
// The one component for empty, error and dead-end states; organizer screens stay with the symbol,
// except the system pages (404, 403, error — `SystemPageLayout`), which keep their illustration
// in the organizer area too (Figma 27525:7237).
export function EmptyState({
  message,
  title,
  titleAs: TitleTag = "h2",
  illustration,
  action,
  role,
  className,
}: EmptyStateProps) {
  return (
    <div
      role={role}
      className={cn("flex flex-col items-center gap-4 py-8 text-center", className)}
    >
      {illustration ?? <LogoSymbol className="empty-state-symbol size-14 text-primary" />}
      {title ? <TitleTag className="text-2xl/8 font-bold">{title}</TitleTag> : null}
      {message ? (
        <p className={cn("text-muted-foreground", !title && "text-sm")}>{message}</p>
      ) : null}
      {action}
    </div>
  )
}
