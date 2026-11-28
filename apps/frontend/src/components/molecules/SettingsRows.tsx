import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** A section of the account settings: an H2 over one ink-edged card of rows. */
// Figma (Design system v2): Sekce · Profil · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27652-34064
export function SettingsSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3"
    >
      <h2
        id={id}
        className="text-xl font-semibold"
      >
        {title}
      </h2>
      <Card className="gap-0 divide-y divide-border p-0">{children}</Card>
    </section>
  )
}

/**
 * One setting: its name and current value (or what it does) on the left, its control or a quiet
 * „Upravit“ on the right; an inline form opens under it.
 */
// Figma (Design system v2): Řádek · Jméno a příjmení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27652-34074
export function SettingsRow({
  id,
  label,
  value,
  action,
  children,
  isControlBelowOnMobile = false,
}: {
  /** Labels the control in `action` (`aria-labelledby`). */
  id?: string
  label: string
  value?: ReactNode
  action?: ReactNode
  /** The inline form while the setting is being changed. */
  children?: ReactNode
  /** A control (not a quiet button) goes under its label on a phone. */
  isControlBelowOnMobile?: boolean
}) {
  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <div
        className={cn(
          "flex min-h-10 gap-x-4",
          isControlBelowOnMobile
            ? "flex-col items-start gap-y-3 sm:flex-row sm:items-center"
            : "flex-wrap items-center gap-y-2",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col gap-0.5",
            isControlBelowOnMobile ? "sm:flex-1" : "flex-1",
          )}
        >
          <span
            id={id}
            className="font-medium"
          >
            {label}
          </span>
          {value ? (
            <span className="text-sm wrap-anywhere text-muted-foreground">{value}</span>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
