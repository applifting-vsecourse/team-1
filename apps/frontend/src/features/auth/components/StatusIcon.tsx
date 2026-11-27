import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** The round icon above the heading of an entry card that didn't work out: grey for a pause, red for a dead end. */
export function StatusIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: "muted" | "error" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-12 items-center justify-center rounded-full",
        tone === "error" ? "bg-status-error-bg text-field-error" : "bg-wash text-muted-foreground",
      )}
    >
      <Icon className="size-6" />
    </span>
  )
}
