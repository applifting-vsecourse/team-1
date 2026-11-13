import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import type { ProgramBlock } from "@/features/program/api/program"
import { formatDay, timeRange } from "@/features/program/lib/days"

/** One day of the program: its blocks by time. The organizer gets row actions, the participant a collapsible description. */
export function ProgramDayCard({
  date,
  blocks,
  actions,
  isCollapsible = false,
}: {
  date: string
  blocks: ProgramBlock[]
  /** Row actions (edit, delete) of the organizer. */
  actions?: (block: ProgramBlock) => ReactNode
  /** The description is cut to one line until the participant opens it. */
  isCollapsible?: boolean
}) {
  const { t } = useTranslation("program")
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set())
  const toggle = (id: string) => {
    setOpened((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }
  return (
    <Card className="gap-0 p-6">
      <h2 className="pb-4 text-lg font-semibold tracking-tight">{formatDay(date)}</h2>
      {blocks.length ? (
        <ul className="flex flex-col">
          {blocks.map((block) => {
            const isOpen = opened.has(block.id)
            return (
              <li
                key={block.id}
                className="grid grid-cols-[1fr_auto] items-start gap-x-6 gap-y-1 border-t py-4 md:grid-cols-[7.5rem_1fr_auto]"
              >
                <span className="col-start-1 row-start-1 py-2 text-sm font-medium whitespace-nowrap md:py-0.5">
                  {timeRange(block)}
                </span>
                <div className="col-span-2 row-start-2 flex min-w-0 flex-col gap-1 md:col-span-1 md:col-start-2 md:row-start-1">
                  <span className="break-words">{block.name}</span>
                  {block.place ? (
                    <span className="text-sm break-words text-muted-foreground">{block.place}</span>
                  ) : null}
                  {block.description ? (
                    <p
                      id={`program-block-${block.id}`}
                      className={cn(
                        "text-sm break-words text-muted-foreground",
                        isCollapsible && !isOpen ? "line-clamp-1" : "whitespace-pre-line",
                      )}
                    >
                      {block.description}
                    </p>
                  ) : null}
                  {isCollapsible && block.description ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto self-start p-0 text-sm text-link"
                      aria-expanded={isOpen}
                      aria-controls={`program-block-${block.id}`}
                      onClick={() => {
                        toggle(block.id)
                      }}
                    >
                      {t(isOpen ? "hideDescription" : "showDescription")}
                      <ChevronDown
                        aria-hidden
                        className={cn(isOpen && "rotate-180")}
                      />
                    </Button>
                  ) : null}
                </div>
                {actions ? (
                  <div className="col-start-2 row-start-1 flex gap-1 md:col-start-3">
                    {actions(block)}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="border-t pt-4 text-sm text-muted-foreground">{t("dayEmpty")}</p>
      )}
    </Card>
  )
}
