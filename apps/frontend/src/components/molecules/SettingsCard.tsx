import type { ComponentType, ReactNode } from "react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Tone = "default" | "danger"

/**
 * Header of one setting: an icon in a tinted rounded square (the accent token, destructive for a
 * danger zone), the title and a one-line description. Shared by every card of the event settings,
 * also by the collapsible one, whose trigger renders the title as a `span` (the accordion already
 * wraps the trigger in a heading).
 */
export function SettingsCardHeader({
  icon: Icon,
  title,
  description,
  descriptionId,
  tone = "default",
  as: Title = "h3",
  aside,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  description?: string
  descriptionId?: string
  tone?: Tone
  as?: "h3" | "span"
  aside?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tone === "danger"
            ? "bg-destructive/10 text-destructive"
            : "bg-accent text-accent-foreground",
        )}
      >
        <Icon
          className="size-5"
          aria-hidden={true}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Title
            className={cn(
              "block text-lg font-semibold tracking-tight",
              tone === "danger" && "text-destructive",
            )}
          >
            {title}
          </Title>
          {aside}
        </div>
        {description ? (
          <p
            id={descriptionId}
            className="text-sm font-normal text-muted-foreground"
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/** Card classes of the event settings, so the collapsible card matches the others. */
export const SETTINGS_CARD_CLASS = "p-4 sm:p-6"

/**
 * Card of one setting on the event settings page: the shared header, then the body
 * (usually a form whose save button sits inside the card).
 */
export function SettingsCard({
  icon,
  title,
  description,
  descriptionId,
  tone = "default",
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  description?: string
  descriptionId?: string
  tone?: Tone
  children: ReactNode
}) {
  return (
    <Card
      className={cn("gap-4", SETTINGS_CARD_CLASS, tone === "danger" && "border-destructive/40")}
    >
      <SettingsCardHeader
        icon={icon}
        title={title}
        description={description}
        descriptionId={descriptionId}
        tone={tone}
      />
      {children}
    </Card>
  )
}
