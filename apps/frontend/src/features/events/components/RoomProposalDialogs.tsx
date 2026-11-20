import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { AssignmentRoom } from "@/features/events/api/room-assignments"

type Bed = { room: AssignmentRoom; number: number }

// Figma (Design system v2): Upravit přiřazení v návrhu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-8732 (mobile 24910-9211)
export function EditProposalDialog({
  name,
  beds,
  onClose,
  onApply,
}: {
  name: string
  beds: Bed[]
  onClose: () => void
  onApply: (roomId: string) => void
}) {
  const { t } = useTranslation("events")
  const [bedKey, setBedKey] = useState<string | null>(null)
  const key = (bed: Bed) => `${bed.room.id}:${bed.number}`
  const chosen = beds.find((bed) => key(bed) === bedKey)
  const groups: { title: string; beds: Bed[] }[] = [
    {
      title: t("roomProposal.femaleRooms"),
      beds: beds.filter((bed) => bed.room.gender === "FEMALE"),
    },
    { title: t("roomProposal.maleRooms"), beds: beds.filter((bed) => bed.room.gender === "MALE") },
    { title: t("roomProposal.sharedRooms"), beds: beds.filter((bed) => bed.room.gender === null) },
  ].filter((group) => group.beds.length > 0)
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-160">
        <DialogTitle>{t("roomProposal.editTitle")}</DialogTitle>
        <DialogDescription className="text-base">
          {t("roomProposal.editDescription", { name })}
        </DialogDescription>
        {groups.length > 0 ? (
          <RadioGroup
            value={bedKey ?? ""}
            onValueChange={setBedKey}
            className="gap-4 rounded-lg border border-border p-4"
          >
            {groups.map((group) => (
              <div
                key={group.title}
                className="flex flex-col gap-3"
              >
                <h4 className="text-lg font-semibold">{group.title}</h4>
                {group.beds.map((bed) => (
                  <div
                    key={key(bed)}
                    className="flex items-center gap-3"
                  >
                    <RadioGroupItem
                      id={`bed-${key(bed)}`}
                      value={key(bed)}
                    />
                    <Label htmlFor={`bed-${key(bed)}`}>
                      {t("roomProposal.bed", { room: bed.room.name, number: bed.number })}
                    </Label>
                  </div>
                ))}
              </div>
            ))}
          </RadioGroup>
        ) : null}
        <DialogFooter className="gap-4">
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="lg"
            >
              {t("roomProposal.editCancel")}
            </Button>
          </DialogClose>
          <Button
            type="button"
            size="lg"
            disabled={!chosen}
            onClick={() => chosen && onApply(chosen.room.id)}
          >
            {t("roomProposal.editApply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The confirmation of saving (the second state of the same dialog frame: Potvrdit uložení návrhu) and of discarding. */
// Figma (Design system v2): Potvrdit uložení návrhu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-9613 (mobile 24910-10081)
// Figma (Design system v2): Zahodit návrh · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-10472 (mobile 24910-10937)
export function ConfirmProposalDialog({
  title,
  description,
  confirmLabel,
  isDestructive = false,
  isPending = false,
  error,
  onClose,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  isDestructive?: boolean
  isPending?: boolean
  error?: Error | null
  onClose: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation("events")
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onClose()
      }}
    >
      <DialogContent className="bg-card shadow-md sm:max-w-130">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="text-base">{description}</DialogDescription>
        {error ? (
          <ErrorState
            title={t("roomProposal.saveFailed")}
            error={error}
          />
        ) : null}
        <DialogFooter className="gap-4">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={isPending}
            onClick={onClose}
          >
            {t("roomProposal.back")}
          </Button>
          <Button
            type="button"
            size="lg"
            variant={isDestructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <Loader2 className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
