import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** The round icon above the heading of an entry card that didn't work out: grey for a pause, red for a dead end. */
// Figma (Design system v2): Odkaz z e-mailu · nefunguje · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15315-90 (mobil 15315-123), přerušeno 22516:2497, Změna e-mailu · odkaz nefunguje 27460:7173
export function StatusIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: "muted" | "error" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-12 items-center justify-center self-center rounded-full",
        tone === "error" ? "bg-status-error-bg text-field-error" : "bg-wash text-muted-foreground",
      )}
    >
      <Icon className="size-6" />
    </span>
  )
}
