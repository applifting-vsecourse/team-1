import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiErrorCode } from "@/lib/api-client"
import { formatDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termLine, termTitle } from "@/lib/term-label"

import { paymentQueryOptions } from "@/features/event-overview/api/payments"
import {
  changeTerms,
  termChangeOptionsQueryOptions,
  termChangePreviewQueryOptions,
  type TermChangeOption,
  type TermChangeResult,
} from "@/features/event-overview/api/termChange"

type Saved = {
  result: TermChangeResult
  from: TermChangeOption
  to: TermChangeOption
  debtCzk: number
}

/**
 * US-33: an organizer swaps one term of an application for another. The impact is shown before
 * saving; a term without a free bed needs a conscious confirmation (as in US-28).
 * The room line of the first frame and the freed bed of the last are left out: beds come with
 * US-35 and do not exist yet. The place of the button is not drawn in Figma.
 */
// Figma (Design system): #33 Změnit termíny · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-35702 (mobile: 19786-35866)
// Figma (Design system): #33 Nový termín je plně obsazený · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-35958 (mobile: 19786-36117)
// Figma (Design system): #33 Termín byl změněn · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-36200 (mobile: 19786-36336)
export function OrganizerTermChange({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const options = useQuery(termChangeOptionsQueryOptions(applicationId))
  const application = useQuery(paymentQueryOptions(applicationId))
  const [isOpen, setIsOpen] = useState(false)
  const [originalId, setOriginalId] = useState("")
  const [nextId, setNextId] = useState("")
  const [isFullStep, setIsFullStep] = useState(false)
  const [isOverCapacityConfirmed, setIsOverCapacityConfirmed] = useState(false)
  const [saved, setSaved] = useState<Saved | null>(null)

  const current = options.data?.filter((term) => term.selected) ?? []
  const candidates = options.data?.filter((term) => !term.selected) ?? []
  const original = current.find((term) => term.id === originalId)
  const next = candidates.find((term) => term.id === nextId)
  const termIds =
    original && next
      ? [...current.filter((term) => term.id !== original.id).map((term) => term.id), next.id]
      : []
  const preview = useQuery({
    ...termChangePreviewQueryOptions(applicationId, termIds),
    enabled: isOpen && termIds.length > 0,
  })
  const added = preview.data?.added[0]
  const removed = preview.data?.removed[0]

  const close = () => {
    setIsOpen(false)
    setIsFullStep(false)
    setIsOverCapacityConfirmed(false)
  }
  const mutation = useMutation({
    mutationFn: () => changeTerms(applicationId, termIds, isOverCapacityConfirmed),
    onSuccess: async (result) => {
      if (original && next) {
        setSaved({ result, from: original, to: next, debtCzk: added?.priceCzk ?? 0 })
      }
      close()
      setNextId("")
      await client.invalidateQueries({ queryKey: ["eventOverview"] })
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
    },
    onError: (error) => {
      if (apiErrorCode(error) === "CAPACITY_EXCEEDED") setIsFullStep(true)
    },
  })

  if (current.length === 0 || candidates.length === 0) return null
  const open = () => {
    setOriginalId(current[0]?.id ?? "")
    setNextId("")
    setSaved(null)
    setIsOpen(true)
  }
  const hasError = mutation.error && apiErrorCode(mutation.error) !== "CAPACITY_EXCEEDED"
  const name = application.data ? `${application.data.firstName} ${application.data.lastName}` : ""

  return (
    <>
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={open}
        >
          {t("termChange.trigger")}
        </Button>
      </div>
      {saved ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
            {t("termChange.done.title")}
          </h2>
          <Card className="gap-4 p-4">
            <h3 className="text-xl font-semibold tracking-tight">{t("termChange.done.record")}</h3>
            <p>
              {t("termChange.done.when", {
                date: formatDateTime(saved.result.changedAt),
                who: saved.result.changedByName ?? "",
              })}
            </p>
            <p>
              {t("termChange.done.terms", {
                from: termTitle(saved.from),
                to: termTitle(saved.to),
              })}
            </p>
            <p>{t("termChange.done.debt", { amount: formatCzk(saved.debtCzk) })}</p>
            <p>{t("termChange.done.email")}</p>
          </Card>
        </section>
      ) : null}
      <Dialog
        open={isOpen}
        onOpenChange={(isNowOpen) => {
          if (!isNowOpen && !mutation.isPending) close()
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-160">
          {isFullStep && next && added ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{t("termChange.full.title")}</DialogTitle>
                <DialogDescription className="sr-only">
                  {t("termChange.full.alertDescription", {
                    term: termTitle(next),
                    confirmed: added.confirmed,
                    capacity: added.capacity,
                    next: added.confirmed + 1,
                  })}
                </DialogDescription>
              </DialogHeader>
              <Alert variant="destructive">
                <AlertTitle className="line-clamp-none">
                  {t("termChange.full.alertTitle")}
                </AlertTitle>
                <AlertDescription>
                  {t("termChange.full.alertDescription", {
                    term: termTitle(next),
                    confirmed: added.confirmed,
                    capacity: added.capacity,
                    next: added.confirmed + 1,
                  })}
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="over-capacity"
                  checked={isOverCapacityConfirmed}
                  onCheckedChange={(value) => setIsOverCapacityConfirmed(value === true)}
                />
                <Label htmlFor="over-capacity">{t("termChange.full.confirm")}</Label>
              </div>
              {hasError ? (
                <p
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {mutation.error.message}
                </p>
              ) : null}
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  size="lg"
                  disabled={!isOverCapacityConfirmed || mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {t("termChange.full.submit")}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setIsFullStep(false)
                    setIsOverCapacityConfirmed(false)
                  }}
                >
                  {t("termChange.full.back")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{t("termChange.title")}</DialogTitle>
                <DialogDescription className="text-base text-foreground">
                  {t("termChange.subject", {
                    name,
                    event: application.data?.eventName ?? "",
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <Label>{t("termChange.original")}</Label>
                <Select
                  value={originalId}
                  onValueChange={setOriginalId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {current.map((term) => (
                      <SelectItem
                        key={term.id}
                        value={term.id}
                      >
                        {termLine(term)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("termChange.next")}</Label>
                <Select
                  value={nextId}
                  onValueChange={setNextId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("termChange.pick")} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((term) => (
                      <SelectItem
                        key={term.id}
                        value={term.id}
                      >
                        {termLine(term)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {preview.error ? (
                <p
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {t("termChange.impact.errorTitle")}
                </p>
              ) : null}
              {preview.data && added && removed ? (
                <Card className="gap-4 p-4">
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {t("termChange.impact.title")}
                  </h3>
                  <p>
                    {t("termChange.impact.added", {
                      price: formatCzk(added.priceCzk),
                      owed: formatCzk(preview.data.amountToPayCzk),
                    })}
                  </p>
                  <p>
                    {t("termChange.impact.removed", {
                      paid: formatCzk(removed.paidCzk),
                      overpayment: formatCzk(preview.data.overpaymentCzk),
                    })}
                  </p>
                  <p>{t("termChange.impact.noTransfer")}</p>
                  {added.fits ? (
                    <p>
                      {t("termChange.impact.fits", {
                        confirmed: added.confirmed,
                        capacity: added.capacity,
                      })}
                    </p>
                  ) : null}
                </Card>
              ) : null}
              {hasError ? (
                <p
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {mutation.error.message}
                </p>
              ) : null}
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  size="lg"
                  disabled={!preview.data || mutation.isPending}
                  onClick={() => (added?.fits === false ? setIsFullStep(true) : mutation.mutate())}
                >
                  {t("termChange.submit")}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  disabled={mutation.isPending}
                  onClick={close}
                >
                  {t("termChange.cancel")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
