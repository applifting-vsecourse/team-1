import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
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

import { boardKeys, deletePost, type OrganizerPostItem } from "@/features/board/api/board"

/** Deleting a post: one confirmation; it is gone for every applicant at once. */
export function DeleteBoardPostDialog({
  eventId,
  post,
  onClose,
}: {
  eventId: string
  post: OrganizerPostItem
  onClose: () => void
}) {
  const { t } = useTranslation("board")
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deletePost(eventId, post.id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: boardKeys.all })
      notify.success(t("deleteDialog.deleted"))
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
      <DialogContent className="gap-4 p-6 sm:max-w-140">
        <DialogHeader>
          <DialogTitle className="text-lg tracking-tight">{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>{t("deleteDialog.description")}</DialogDescription>
        </DialogHeader>
        {mutation.isError ? (
          <ErrorState
            title={t("deleteDialog.failed")}
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
            {t("deleteDialog.cancel")}
          </Button>
          <PendingButton
            isPending={mutation.isPending}
            variant="destructive"
            size="lg"
            onClick={() => {
              mutation.mutate()
            }}
          >
            {t("deleteDialog.confirm")}
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
