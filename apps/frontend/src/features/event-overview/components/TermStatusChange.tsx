import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
 * again is the organizer's conscious decision (US-28). No Figma frame exists for it yet.
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
  const mutation = useMutation({
    mutationFn: () => changeTermStatus(applicationId, term.termId, to, isOverCapacity),
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
  const hasError = mutation.error && !isOverCapacity
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
            <AlertDescription>{t("termStatus.overCapacityDescription")}</AlertDescription>
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
          <Button
            variant={to === "CANCELLED" ? "destructive" : "default"}
            size="lg"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t(isOverCapacity ? "termStatus.confirmAnyway" : `termStatus.dialog.${key}Submit`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
