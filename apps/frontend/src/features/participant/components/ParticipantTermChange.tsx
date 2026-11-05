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

/** Immediate term changes before cancellation starts (US-113). The full US-84 design is pending. */
export function ParticipantTermChange({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("participant")
  const query = useQuery(participantChangeOptionsQueryOptions(applicationId))
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<string[] | null>(null)
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: (termIds: string[]) => changeParticipantTerms(applicationId, termIds),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
      notify.success(t("change.saved"))
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

  if (!query.data.canChangeImmediately) {
    return <p className="pt-4 text-sm text-muted-foreground">{t("change.approvalRequired")}</p>
  }
  if (query.data.terms.length === 0) return null

  const current = query.data.terms.filter((term) => term.selected).map((term) => term.id)
  const chosen = selected ?? current
  const activeCount = current.length

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">{t("change.immediateNote")}</p>
        <Button
          variant="outline"
          size="lg"
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
            <DialogDescription>{t("change.description")}</DialogDescription>
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
              <AlertDescription>{t("change.cancelAllDescription")}</AlertDescription>
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
              variant={chosen.length === 0 ? "destructive" : "default"}
              size="lg"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(chosen)}
            >
              {t(
                mutation.isPending
                  ? "change.saving"
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
