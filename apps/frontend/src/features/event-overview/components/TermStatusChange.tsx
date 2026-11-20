import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { formatDateRange } from "@/lib/date"

import {
  changeTermStatus,
  type TermStatus,
  type TermStatusDetail,
} from "@/features/event-overview/api/termStatus"

const KEY = { CONFIRMED: "confirm", WAITLISTED: "waitlist", CANCELLED: "cancel" } as const

/**
 * Confirms one manual status change. When confirming would exceed the capacity of the term
 * the server answers `CAPACITY_EXCEEDED`; the dialog then shows the warning and confirming
 * again requires explicit consent. Figma v2 US-28: https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=19298-26443
 */
export function TermStatusChange({
  applicationId,
  term,
  to,
  onClose,
}: {
  applicationId: string
  term: TermStatusDetail
  to: TermStatus
  onClose: () => void
}) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const [isOverCapacity, setIsOverCapacity] = useState(false)
  const [hasAccepted, setAccepted] = useState(false)
  const mutation = useMutation({
    mutationFn: () =>
      changeTermStatus(applicationId, term.termId, to, isOverCapacity && hasAccepted),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["eventOverview"] })
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
      onClose()
    },
    onError: (error) => {
      if ((error as { code?: string }).code === "CAPACITY_EXCEEDED") setIsOverCapacity(true)
    },
  })
  const key = KEY[to]
  const hasError =
    mutation.error && (mutation.error as { code?: string }).code !== "CAPACITY_EXCEEDED"
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-6 sm:max-w-130">
        <DialogHeader>
          <DialogTitle className="text-lg tracking-tight">
            {t(`termStatus.dialog.${key}Title`)}
          </DialogTitle>
          <DialogDescription>
            {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
          </DialogDescription>
        </DialogHeader>
        <p>{t(`termStatus.dialog.${key}Description`)}</p>
        {isOverCapacity ? (
          <Alert className="border-status-warning bg-status-warning-bg">
            <AlertTitle className="line-clamp-none">{t("termStatus.overCapacityTitle")}</AlertTitle>
            <AlertDescription>
              {t("termStatus.overCapacityDescription")}
              <Label className="mt-3 flex items-center gap-2">
                <Checkbox
                  checked={hasAccepted}
                  onCheckedChange={(value) => setAccepted(value === true)}
                  disabled={mutation.isPending}
                />
                {t("termStatus.acceptOverCapacity")}
              </Label>
            </AlertDescription>
          </Alert>
        ) : null}
        {hasError ? (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            {mutation.error.message}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            {t("termStatus.dialog.back")}
          </Button>
          <PendingButton
            isPending={mutation.isPending}
            variant={to === "CANCELLED" ? "destructive" : "default"}
            size="lg"
            disabled={mutation.isPending || (isOverCapacity && !hasAccepted)}
            onClick={() => mutation.mutate()}
          >
            {t(isOverCapacity ? "termStatus.confirmAnyway" : `termStatus.dialog.${key}Submit`)}
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
