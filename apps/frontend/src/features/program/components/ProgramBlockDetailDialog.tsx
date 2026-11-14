import { CalendarClock, MapPin, Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { ProgramBlock } from "@/features/program/api/program"
import { formatDay, timeRange } from "@/features/program/lib/days"

// All about one block of the program. The organizer also gets edit and delete, the participant only reads.
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
      <DialogContent className="gap-4 bg-card p-6 shadow-md sm:max-w-130">
        <DialogHeader>
          <DialogTitle className="pr-8 text-lg tracking-tight break-words">
            {block.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <CalendarClock
              aria-hidden
              className="size-4 shrink-0"
            />
            {formatDay(block.date)}, {timeRange(block)}
          </DialogDescription>
        </DialogHeader>
        {block.place ? (
          <p className="flex items-center gap-2 text-sm">
            <MapPin
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="sr-only">{t("placeLabel")}: </span>
            <span className="break-words">{block.place}</span>
          </p>
        ) : null}
        {block.description ? (
          <p className="text-sm break-words whitespace-pre-line text-muted-foreground">
            {block.description}
          </p>
        ) : null}
        {onEdit && onDelete ? (
          <DialogFooter className="gap-3 max-sm:flex-col-reverse sm:items-center">
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
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
