import type { ReactNode } from "react"
import { Circle, CircleCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export type ChecklistItem = {
  key: string
  title: string
  body?: string
  /** A done item shows a check; an open one an empty circle. */
  isDone: boolean
  /** Shown as a badge instead of the icon — the icon looks like a radio button you can click. */
  statusLabel?: string
  /** The button or link that does the step; usually only for open items. */
  action?: ReactNode
}

type ChecklistProps = {
  title: string
  intro?: string
  /** How far it is, e.g. "1 of 2 done". */
  progress?: string
  items: ChecklistItem[]
}

/**
 * A card with the steps still to be done and the ones already done — "what is left before the
 * application link works" for the organizer, "what is left to arrange" for the participant.
 */
// Figma (Design system): O04a Co chybí ke zpřístupnění přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12264-1440
export function Checklist({ title, intro, progress, items }: ChecklistProps) {
  return (
    <Card className="gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          {intro ? <p className="text-sm text-muted-foreground">{intro}</p> : null}
        </div>
        {progress ? <p className="text-sm text-muted-foreground">{progress}</p> : null}
      </div>
      <ul className="flex flex-col">
        {items.map((item) => {
          const Icon = item.isDone ? CircleCheck : Circle
          return (
            <li
              key={item.key}
              className="flex flex-wrap items-center gap-3 border-t border-border py-4 last:pb-0"
            >
              {item.statusLabel ? null : (
                <Icon
                  aria-hidden
                  className={item.isDone ? "size-5 text-primary" : "size-5 text-muted-foreground"}
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h4 className="text-sm font-medium">{item.title}</h4>
                {item.body ? <p className="text-sm text-muted-foreground">{item.body}</p> : null}
              </div>
              {item.statusLabel ? (
                <Badge variant={item.isDone ? "success" : "warning"}>{item.statusLabel}</Badge>
              ) : null}
              {item.action}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
