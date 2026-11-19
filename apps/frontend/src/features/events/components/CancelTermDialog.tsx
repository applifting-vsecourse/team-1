import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleAlert, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
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
import { Textarea } from "@/components/ui/textarea"
import { HTTPError } from "@/lib/api-client"
import { termLine } from "@/lib/term-label"

import { termsQueryOptions, type EventTerm } from "@/features/events/api/terms"
import { useCancelTerm } from "@/features/events/hooks/useTermMutations"

type CancelTermDialogProps = {
  eventId: string
  eventName: string
  term: EventTerm
  onClose: () => void
  /** `cancelledApplications` is how many applications the cancellation cancelled. */
  onCancelled: (term: EventTerm, cancelledApplications: number) => void
}

/**
 * US-131: the critical, irreversible cancellation of a term and the applications in it. The
 * organizer sees how many applications it touches and must agree before the button works.
 */
// Figma (Design system v2): US-131 Před potvrzením zrušení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22437-87722 (mobile 22437-87826)
// Figma (Design system v2): US-131 Zaškrtnutý souhlas · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22437-87993 (mobile 22437-88099)
// Figma (Design system v2): US-131 Výsledek zrušení nelze ověřit · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22515-96357 (mobile 22515-96465)
export function CancelTermDialog({
  eventId,
  eventName,
  term: listedTerm,
  onClose,
  onCancelled,
}: CancelTermDialogProps) {
  const { t } = useTranslation("events")
  const queryClient = useQueryClient()
  const [reason, setReason] = useState("")
  // The number the organizer agreed to; a different one (applications came meanwhile) voids it.
  const [agreedCount, setAgreedCount] = useState<number | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const cancel = useCancelTerm(eventId, listedTerm.id)

  // The counts are read again on open: they are what the irreversible action will cancel.
  const terms = useQuery({ ...termsQueryOptions(eventId), refetchOnMount: "always" })
  const term = terms.data?.find(({ id }) => id === listedTerm.id) ?? listedTerm
  const affected = term.confirmedCount + term.waitlistedCount + term.toEvaluateCount
  const isAgreed = agreedCount === affected
  // The counts could not be refreshed: confirming would rest on numbers that may be stale.
  const isStale = terms.isError
  // No answer at all (network, timeout) or a server error: the transaction may have committed
  // before the response failed, so the term may be cancelled all the same. A 4xx is definite.
  const isUnverified =
    cancel.isError && !(cancel.error instanceof HTTPError && cancel.error.response.status < 500)

  const submit = () => {
    // The reason is optional: blank is sent as no reason.
    cancel.mutate(reason.trim() || undefined, {
      onSuccess: ({ cancelledApplications, ...cancelled }) =>
        onCancelled(cancelled, cancelledApplications),
    })
  }

  const verify = async () => {
    setIsVerifying(true)
    try {
      const terms = await queryClient.fetchQuery({ ...termsQueryOptions(eventId), staleTime: 0 })
      const current = terms.find(({ id }) => id === term.id)
      if (current?.cancelledAt) onCancelled(current, affected)
      else cancel.reset()
    } catch {
      // Still no answer: the dialog stays, the organizer can try again.
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}
    >
      <DialogContent className="max-h-dvh max-w-full gap-4 overflow-y-auto p-4 sm:max-h-[calc(100dvh-2rem)] sm:max-w-160 sm:p-6">
        <DialogHeader>
          <p className="text-xs font-medium text-muted-foreground uppercase">{eventName}</p>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {t(isUnverified ? "terms.cancelDialog.unverifiedTitle" : "terms.cancelDialog.title")}
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            {termLine(term)}
          </DialogDescription>
        </DialogHeader>

        {isUnverified ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>{t("terms.cancelDialog.unverifiedAlertTitle")}</AlertTitle>
            <AlertDescription>{t("terms.cancelDialog.unverifiedAlertText")}</AlertDescription>
          </Alert>
        ) : isStale ? (
          <ErrorState
            title={t("terms.cancelDialog.refreshFailedTitle")}
            error={terms.error}
            onRetry={() => void terms.refetch()}
          />
        ) : (
          <>
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>{t("terms.cancelDialog.warningTitle")}</AlertTitle>
              <AlertDescription>{t("terms.cancelDialog.warningText")}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 rounded-lg border px-4 py-3">
              <p className="text-2xl font-bold tracking-tight">
                {t("terms.cancelDialog.summary", { count: affected })}
              </p>
              <p>
                {t("terms.cancelDialog.breakdown", {
                  confirmed: t("terms.cancelDialog.confirmed", { count: term.confirmedCount }),
                  waitlisted: t("terms.cancelDialog.waitlisted", { count: term.waitlistedCount }),
                  toEvaluate: t("terms.cancelDialog.toEvaluate", { count: term.toEvaluateCount }),
                })}
              </p>
              <p className="text-sm text-muted-foreground">{t("terms.cancelDialog.unchanged")}</p>
              <p className="text-sm text-muted-foreground">{t("terms.cancelDialog.emails")}</p>
              <p className="text-sm text-muted-foreground">{t("terms.cancelDialog.refunds")}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cancel-reason">{t("terms.cancelDialog.reason")}</Label>
              <Textarea
                id="cancel-reason"
                value={reason}
                className="min-h-22"
                onChange={(event) => setReason(event.target.value)}
              />
              <p className="text-xs font-medium text-muted-foreground">
                {t("terms.cancelDialog.reasonHelper")}
              </p>
            </div>
            <div className="flex min-h-11 items-center gap-3">
              <Checkbox
                id="cancel-consent"
                className="size-5"
                checked={isAgreed}
                onCheckedChange={(isChecked) =>
                  setAgreedCount(isChecked === true ? affected : null)
                }
              />
              <Label
                htmlFor="cancel-consent"
                className="flex-1 cursor-pointer text-base leading-6 font-normal"
              >
                {t("terms.cancelDialog.consent", { count: affected })}
              </Label>
            </div>
            {cancel.isError ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{cancel.error.message}</AlertDescription>
              </Alert>
            ) : null}
          </>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
          >
            {t("terms.cancelDialog.back")}
          </Button>
          {isUnverified ? (
            <Button
              type="button"
              size="lg"
              disabled={isVerifying}
              onClick={() => void verify()}
            >
              {isVerifying ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("terms.cancelDialog.verify")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={!isAgreed || cancel.isPending || terms.isFetching || isStale}
              onClick={submit}
            >
              {cancel.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("terms.cancelDialog.confirm")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
