import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type DetailItemProps = {
  label: string
  children: ReactNode
  className?: string
}

/** A label with its value under it, for summaries (the current e-mail, a pending change). */
// Figma (Design system): Togena / Detail item · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16669-11046
export function DetailItem({ label, children, className }: DetailItemProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="break-words">{children}</p>
    </div>
  )
}
