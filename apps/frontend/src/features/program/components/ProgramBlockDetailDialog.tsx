import type { ComponentType, ReactNode } from "react"
import { CalendarDays, Clock, MapPin, Pencil, StickyNote, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"

import type { ProgramBlock } from "@/features/program/api/program"
import { formatDay, formatDuration, timeRange } from "@/features/program/lib/days"

// All about one block of the program: name on top, then day, time, place and note, each on its own row
// with an icon. The organizer also gets edit and delete, the participant only reads.
// Deviation from Figma by request: opened by a click on the block in the calendar.
export function ProgramBlockDetailDialog({
  block,
  onEdit,
  onDelete,
  onClose,
}: {
  block: ProgramBlock
  /** Organizer only. */
  onEdit?: () => void
  /** Organizer only. */
  onDelete?: () => void
  onClose: () => void
}) {
  const { t } = useTranslation("program")
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto bg-card p-0 shadow-md sm:max-w-130">
        <div className="flex flex-col gap-1 p-6 pr-14">
          <DialogTitle className="text-xl leading-tight tracking-tight break-words">
            {block.name}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("detailHint")}</DialogDescription>
        </div>
        <dl className="flex flex-col">
          <Row
            icon={CalendarDays}
            label={t("dayLabel")}
          >
            {formatDay(block.date)}
          </Row>
          <Row
            icon={Clock}
            label={t("timeLabel")}
          >
            {timeRange(block)}
            <span className="font-normal text-muted-foreground"> · {formatDuration(block)}</span>
          </Row>
          {block.place ? (
            <Row
              icon={MapPin}
              label={t("placeLabel")}
            >
              {block.place}
            </Row>
          ) : null}
          {block.description ? (
            <Row
              icon={StickyNote}
              label={t("descriptionLabel")}
            >
              <span className="font-normal whitespace-pre-line text-muted-foreground">
                {block.description}
              </span>
            </Row>
          ) : null}
        </dl>
        {onEdit && onDelete ? (
          <DialogFooter className="gap-3 border-t p-6 max-sm:flex-col-reverse sm:items-center">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
              onClick={onDelete}
            >
              <Trash2 />
              {t("delete")}
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={onEdit}
            >
              <Pencil />
              {t("edit")}
            </Button>
          </DialogFooter>
        ) : (
          <div className="border-t" />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ "aria-hidden"?: boolean; className?: string }>
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-4 border-t px-6 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <Icon
          aria-hidden
          className="size-5"
        />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {label}
        </dt>
        <dd className="text-sm font-medium break-words">{children}</dd>
      </div>
    </div>
  )
}
