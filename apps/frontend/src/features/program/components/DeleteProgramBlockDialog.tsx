import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { notify } from "@/lib/notify"

import { deleteProgramBlock, programKeys, type ProgramBlock } from "@/features/program/api/program"
import { formatDay, timeRange } from "@/features/program/lib/days"

// Deleting a block of the program: one confirmation, the participants stop seeing it at once.
// Design: Figma (Design system) US-66 · X25d Smazat blok · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23264-92814
export function DeleteProgramBlockDialog({
  eventId,
  block,
  onClose,
}: {
  eventId: string
  block: ProgramBlock
  onClose: () => void
}) {
  const { t } = useTranslation("program")
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteProgramBlock(eventId, block.id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: programKeys.event(eventId) })
      notify.success(t("deleted"))
      onClose()
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="gap-4 p-6 sm:max-w-130">
        <DialogHeader>
          <DialogTitle className="text-lg tracking-tight">{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("deleteDescription", {
              name: block.name,
              when: `${formatDay(block.date).toLowerCase()}, ${timeRange(block)}`,
            })}
          </DialogDescription>
        </DialogHeader>
        {mutation.isError ? (
          <ErrorState
            title={t("deleteFailed")}
            error={mutation.error}
          />
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => {
              mutation.mutate()
            }}
          >
            {t(mutation.isPending ? "deleting" : "delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
