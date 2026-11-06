import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { TermLabel } from "@/components/molecules/TermLabel"
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
import { notify } from "@/lib/notify"

import {
  changeParticipantTerms,
  participantChangeOptionsQueryOptions,
} from "@/features/participant/api/applications"
import {
  participantChangeRequestsQueryOptions,
  submitChangeRequest,
} from "@/features/participant/api/changeRequests"

/** Immediate term changes before cancellation starts (US-113). The full US-84 design is pending. */
export function ParticipantTermChange({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("participant")
  const query = useQuery(participantChangeOptionsQueryOptions(applicationId))
  const requests = useQuery(participantChangeRequestsQueryOptions(applicationId))
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<string[] | null>(null)
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (termIds: string[]) =>
      query.data?.canChangeImmediately
        ? changeParticipantTerms(applicationId, termIds)
        : submitChangeRequest(applicationId, termIds),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
      await client.invalidateQueries({ queryKey: ["participant", "change-request-notifications"] })
      notify.success(t(query.data?.canChangeImmediately ? "change.saved" : "change.requested"))
      setIsOpen(false)
      setSelected(null)
    },
  })

  if (query.isPending) return null
  if (query.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("change.loadError")}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-3">
          {query.error.message}
          <Button
            variant="outline"
            onClick={() => void query.refetch()}
          >
            {t("change.retry")}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (query.data.terms.length === 0) return null

  const current = query.data.terms.filter((term) => term.selected).map((term) => term.id)
  const chosen = selected ?? current
  const activeCount = current.length
  const isPendingRequest = requests.data?.some((request) => request.status === "PENDING") ?? false

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">
          {t(query.data.canChangeImmediately ? "change.immediateNote" : "change.approvalRequired")}
        </p>
        <Button
          variant="outline"
          size="lg"
          disabled={isPendingRequest || requests.isPending}
          onClick={() => {
            setSelected(current)
            setIsOpen(true)
          }}
        >
          {t("change.open")}
        </Button>
      </div>
      <Dialog
        open={isOpen}
        onOpenChange={(isOpenNow) => {
          if (!mutation.isPending) {
            setIsOpen(isOpenNow)
            if (!isOpenNow) setSelected(null)
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-6 sm:max-w-130">
          <DialogHeader>
            <DialogTitle>{t("change.title")}</DialogTitle>
            <DialogDescription>
              {t(
                query.data.canChangeImmediately
                  ? "change.description"
                  : "change.requestDescription",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col">
            {query.data.terms.map((term) => (
              <label
                key={term.id}
                htmlFor={`term-option-${term.id}`}
                className="flex cursor-pointer items-start gap-3 border-t py-4"
              >
                <Checkbox
                  id={`term-option-${term.id}`}
                  checked={chosen.includes(term.id)}
                  onCheckedChange={(checked) => {
                    setSelected(
                      checked ? [...chosen, term.id] : chosen.filter((id) => id !== term.id),
                    )
                  }}
                  aria-label={t("change.selectTerm", { term: term.name ?? term.startsOn })}
                />
                <TermLabel term={term} />
              </label>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{t("change.paymentNote")}</p>
          {chosen.length === 0 && activeCount > 0 ? (
            <Alert>
              <AlertTitle>{t("change.cancelAllTitle")}</AlertTitle>
              <AlertDescription>
                {t(
                  query.data.canChangeImmediately
                    ? "change.cancelAllDescription"
                    : "change.requestCancelDescription",
                )}
              </AlertDescription>
            </Alert>
          ) : null}
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              disabled={mutation.isPending}
              onClick={() => setIsOpen(false)}
            >
              {t("change.back")}
            </Button>
            <Button
              variant={
                chosen.length === 0 && query.data.canChangeImmediately ? "destructive" : "default"
              }
              size="lg"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(chosen)}
            >
              {t(
                mutation.isPending
                  ? "change.saving"
                  : !query.data.canChangeImmediately
                    ? "change.requestSubmit"
                    : chosen.length === 0
                      ? "change.cancelAll"
                      : "change.save",
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
