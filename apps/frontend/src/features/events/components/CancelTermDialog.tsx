import { useState } from "react"
import { CircleAlert, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDateRange } from "@/lib/date"

import type { EventTerm } from "@/features/events/api/terms"
import { useCancelTerm } from "@/features/events/hooks/useTermMutations"

type CancelTermDialogProps = {
  eventId: string
  eventName: string
  term: EventTerm
  onClose: () => void
  onCancelled: (term: EventTerm) => void
}

/** X18: confirm cancelling a term — what it affects and a reason kept for the organizers. */
// Figma (Design system): X18 Potvrdit zrušení termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12283-420
export function CancelTermDialog({
  eventId,
  eventName,
  term,
  onClose,
  onCancelled,
}: CancelTermDialogProps) {
  const { t } = useTranslation("events")
  const [reason, setReason] = useState("")
  const [isInvalid, setIsInvalid] = useState(false)
  const cancel = useCancelTerm(eventId, term.id)

  const submit = () => {
    if (!reason.trim()) {
      setIsInvalid(true)
      return
    }
    cancel.mutate(reason.trim(), { onSuccess: onCancelled })
  }

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}
    >
      <DialogContent className="gap-4 p-6 sm:max-w-170">
        <DialogHeader>
          <p className="text-xs font-medium text-muted-foreground uppercase">{eventName}</p>
          <DialogTitle className="text-lg tracking-tight">
            {t("terms.cancelDialog.title", { name: term.name })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("terms.cancelDialog.history")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 rounded-lg border border-status-warning bg-status-warning-bg p-6">
          <p className="text-lg font-semibold tracking-tight text-status-warning">
            {t("terms.cancelDialog.impact", {
              confirmed: t("terms.cancelDialog.confirmed", { count: term.confirmedCount }),
              waitlisted: t("terms.cancelDialog.waitlisted", { count: term.waitlistedCount }),
            })}
          </p>
          <p className="text-sm">
            {t("terms.cancelDialog.notOffered", {
              dates: formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }),
            })}
          </p>
        </div>
        <p className="text-muted-foreground">{t("terms.cancelDialog.history")}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cancel-reason">{t("terms.cancelDialog.reason")}</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            aria-invalid={isInvalid}
            className="min-h-22"
            onChange={(event) => {
              setReason(event.target.value)
              setIsInvalid(false)
            }}
          />
          <p
            className={
              isInvalid
                ? "text-xs font-medium text-destructive"
                : "text-xs font-medium text-muted-foreground"
            }
          >
            {isInvalid ? t("terms.form.fieldRequired") : t("terms.cancelDialog.reasonHelper")}
          </p>
        </div>

        {cancel.isError ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{cancel.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onClose}
          >
            {t("terms.cancelDialog.keep")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={cancel.isPending}
            onClick={submit}
          >
            {cancel.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("terms.cancelDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
