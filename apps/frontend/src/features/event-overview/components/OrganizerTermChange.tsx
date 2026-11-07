import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowRightLeft } from "lucide-react"
import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiErrorCode } from "@/lib/api-client"
import { notify } from "@/lib/notify"
import { termLine, termTitle } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import { paymentQueryOptions } from "@/features/event-overview/api/payments"
import {
  changeTerms,
  termChangeOptionsQueryOptions,
  termChangePreviewQueryOptions,
} from "@/features/event-overview/api/termChange"
import { type TermStatusDetail } from "@/features/event-overview/api/termStatus"
import { ImpactFigure } from "@/features/event-overview/components/ImpactFigure"

/**
 * US-33: an organizer swaps one term of an application for another, from the "Status in terms"
 * block. The impact is shown before saving; a term without a free bed needs a conscious
 * confirmation (as in US-28). Room lines of the frames are left out: beds come with US-35.
 * The layout of the dialog follows the product owner's review of the first version, not the
 * frame (see the PR).
 */
// Figma (Design system): #33 Změnit termíny · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-35702 (mobile: 19786-35866)
// Figma (Design system): #33 Nový termín je plně obsazený · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-35958 (mobile: 19786-36117)
// Figma (Design system): #33 Termín byl změněn · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-36200 (mobile: 19786-36336)
export function OrganizerTermChange({
  applicationId,
  term,
}: {
  applicationId: string
  /** The term of the application that is swapped for another one. */
  term: TermStatusDetail
}) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const options = useQuery(termChangeOptionsQueryOptions(applicationId))
  const application = useQuery(paymentQueryOptions(applicationId))
  const [isOpen, setIsOpen] = useState(false)
  const [nextId, setNextId] = useState("")
  const [isFullStep, setIsFullStep] = useState(false)
  const [isOverCapacityConfirmed, setIsOverCapacityConfirmed] = useState(false)

  const current = options.data?.filter((row) => row.selected) ?? []
  const candidates = options.data?.filter((row) => !row.selected) ?? []
  const original = term
  const next = candidates.find((row) => row.id === nextId)
  const termIds = next
    ? [...current.filter((row) => row.id !== term.termId).map((row) => row.id), next.id]
    : []
  const preview = useQuery({
    ...termChangePreviewQueryOptions(applicationId, termIds),
    enabled: isOpen && termIds.length > 0,
  })
  const added = preview.data?.added[0]
  const removed = preview.data?.removed[0]
  const originalPrice =
    application.data?.terms.find((row) => row.termId === term.termId)?.priceCzk ?? 0

  const close = () => {
    setIsOpen(false)
    setIsFullStep(false)
    setIsOverCapacityConfirmed(false)
  }
  const mutation = useMutation({
    mutationFn: () => changeTerms(applicationId, termIds, isOverCapacityConfirmed),
    onSuccess: async () => {
      close()
      setNextId("")
      notify.success(t("termChange.done.title"), t("termChange.done.description"))
      await client.invalidateQueries({ queryKey: ["eventOverview"] })
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
    },
    onError: (error) => {
      if (apiErrorCode(error) === "CAPACITY_EXCEEDED") setIsFullStep(true)
    },
  })

  if (candidates.length === 0) return null
  const hasError = mutation.error && apiErrorCode(mutation.error) !== "CAPACITY_EXCEEDED"
  const subject = application.data ? (
    <div className="flex flex-col gap-1">
      <span className="text-lg font-semibold text-foreground">
        {application.data.firstName} {application.data.lastName}
      </span>
      <span className="text-sm text-muted-foreground">{application.data.eventName}</span>
    </div>
  ) : null
  const errorMessage = hasError ? (
    <p
      role="alert"
      className="text-sm text-destructive"
    >
      {mutation.error.message}
    </p>
  ) : null

  return (
    <>
      <Button
        variant="secondary"
        className="transition-colors hover:bg-accent hover:text-accent-foreground"
        onClick={() => {
          setNextId("")
          setIsOpen(true)
        }}
      >
        <ArrowRightLeft aria-hidden />
        {t("termChange.trigger")}
      </Button>
      <Dialog
        open={isOpen}
        onOpenChange={(isNowOpen) => {
          if (!isNowOpen && !mutation.isPending) close()
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-160">
          <div className="flex [scrollbar-width:thin] flex-col gap-6 overflow-y-auto p-6">
            {isFullStep && next && added ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{t("termChange.full.title")}</DialogTitle>
                  <DialogDescription className="sr-only">
                    {t("termChange.full.alertTitle")}
                  </DialogDescription>
                </DialogHeader>
                <Alert variant="destructive">
                  <AlertTitle className="line-clamp-none">
                    {t("termChange.full.alertTitle")}
                  </AlertTitle>
                  <AlertDescription>
                    {t("termChange.full.alertDescription", {
                      term: termTitle(next),
                      occupied: added.genderCapacity - added.genderFree,
                      capacity: added.genderCapacity,
                      next: added.genderCapacity - added.genderFree + 1,
                    })}
                  </AlertDescription>
                </Alert>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="over-capacity"
                    checked={isOverCapacityConfirmed}
                    onCheckedChange={(isChecked) => setIsOverCapacityConfirmed(isChecked === true)}
                  />
                  <Label htmlFor="over-capacity">{t("termChange.full.confirm")}</Label>
                </div>
                {errorMessage}
                <DialogFooter>
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={mutation.isPending}
                    onClick={() => {
                      setIsFullStep(false)
                      setIsOverCapacityConfirmed(false)
                    }}
                  >
                    {t("termChange.full.back")}
                  </Button>
                  <Button
                    size="lg"
                    disabled={!isOverCapacityConfirmed || mutation.isPending}
                    onClick={() => mutation.mutate()}
                  >
                    {t("termChange.full.submit")}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{t("termChange.title")}</DialogTitle>
                  <DialogDescription className="sr-only">
                    {application.data
                      ? `${application.data.firstName} ${application.data.lastName} · ${application.data.eventName}`
                      : t("termChange.title")}
                  </DialogDescription>
                </DialogHeader>
                {subject}
                <div className="flex flex-col gap-2">
                  <Label>{t("termChange.original")}</Label>
                  <p className="text-sm font-medium">{termLine(original)}</p>
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
                    <SelectContent position="popper">
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
                {preview.data && added && removed && next ? (
                  <section className="flex flex-col gap-4">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {t("termChange.impact.title")}
                    </h3>
                    <div className="flex flex-col gap-3 border-t pt-4">
                      <p className="font-medium">
                        {t("termChange.original")}
                        <span className="font-normal text-muted-foreground">
                          {" · "}
                          {termTitle(original)}
                        </span>
                      </p>
                      <dl className="grid grid-cols-3 gap-3">
                        <ImpactFigure label={t("termChange.impact.price")}>
                          <MoneyAmount amountCzk={originalPrice} />
                        </ImpactFigure>
                        <ImpactFigure label={t("termChange.impact.paid")}>
                          <MoneyAmount amountCzk={removed.paidCzk} />
                        </ImpactFigure>
                        <ImpactFigure label={t("termChange.impact.overpayment")}>
                          <MoneyAmount amountCzk={removed.overpaymentCzk} />
                        </ImpactFigure>
                      </dl>
                    </div>
                    <div className="flex flex-col gap-3 border-t pt-4">
                      <p className="font-medium">
                        {t("termChange.next")}
                        <span className="font-normal text-muted-foreground">
                          {" · "}
                          {termTitle(next)}
                        </span>
                      </p>
                      <dl className="grid grid-cols-3 gap-3">
                        <ImpactFigure label={t("termChange.impact.price")}>
                          <MoneyAmount amountCzk={added.priceCzk} />
                        </ImpactFigure>
                        <ImpactFigure label={t("termChange.impact.paid")}>
                          <MoneyAmount amountCzk={added.paidCzk} />
                        </ImpactFigure>
                        <ImpactFigure label={t("termChange.impact.toPay")}>
                          <MoneyAmount amountCzk={added.toPayCzk} />
                        </ImpactFigure>
                      </dl>
                      <dl className="grid grid-cols-3 gap-3">
                        <ImpactFigure label={t(`termChange.impact.places.${preview.data.gender}`)}>
                          <span className={cn(!added.fits && "text-destructive")}>
                            {t("termChange.impact.placesValue", {
                              free: Math.max(0, added.genderFree),
                              capacity: added.genderCapacity,
                            })}
                          </span>
                        </ImpactFigure>
                      </dl>
                    </div>
                    <p className="border-t pt-4 text-sm text-muted-foreground">
                      {t("termChange.impact.noTransfer")}
                    </p>
                  </section>
                ) : null}
                {errorMessage}
                <DialogFooter>
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={mutation.isPending}
                    onClick={close}
                  >
                    {t("termChange.cancel")}
                  </Button>
                  <Button
                    size="lg"
                    disabled={!preview.data || mutation.isPending}
                    onClick={() =>
                      added?.fits === false ? setIsFullStep(true) : mutation.mutate()
                    }
                  >
                    {t("termChange.submit")}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
