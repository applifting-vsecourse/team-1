import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { LogoSymbol } from "@/components/atoms/Logo"
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
import { formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import {
  changeTermStatus,
  type TermStatus,
  type TermStatusDetail,
} from "@/features/event-overview/api/termStatus"

// Figma (Design system): #244 Náhradník · povolené změny · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19799-68652 (mobile: 19799-68796)
// Figma: error/saving 19799-68404 / 19799-68180; capacity warning 19298-26443 (mobile: 19298-26591).
export function TermStatusChange({
  applicationId,
  term,
  onClose,
}: {
  applicationId: string
  term: TermStatusDetail
  onClose: () => void
}) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const allowed = term.allowedStatuses.filter(
    (status) =>
      (status !== "WAITLISTED" || term.status !== "CONFIRMED" || term.owedCzk > 0) &&
      (term.status !== "CONFIRMED" || status !== "CANCELLED"),
  )
  const [to, setTo] = useState<TermStatus>(allowed[0] ?? "CONFIRMED")
  const isFull = term.confirmationExceedsCapacity
  const [isOverCapacity, setIsOverCapacity] = useState(allowed[0] === "CONFIRMED" && isFull)
  const [isOverCapacityConfirmed, setIsOverCapacityConfirmed] = useState(false)
  const mutation = useMutation({
    mutationFn: () =>
      changeTermStatus(applicationId, term.termId, to, isOverCapacity && isOverCapacityConfirmed),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["eventOverview"] })
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
      onClose()
    },
    onError: (error) => {
      if ((error as { code?: string }).code === "CAPACITY_EXCEEDED") {
        setIsOverCapacity(true)
        setIsOverCapacityConfirmed(false)
      }
    },
  })
  const hasError =
    mutation.error && (mutation.error as { code?: string }).code !== "CAPACITY_EXCEEDED"
  const title = mutation.isPending
    ? "savingTitle"
    : hasError
      ? "saveErrorTitle"
      : term.status === "WAITLISTED"
        ? "waitlistedTitle"
        : "changeTitle"
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        showCloseButton={!mutation.isPending}
        className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:content-start sm:max-w-150"
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight">{t(`termStatus.${title}`)}</DialogTitle>
          <DialogDescription>
            {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
          </DialogDescription>
        </DialogHeader>
        {hasError ? (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden />
            <AlertTitle>{t("termStatus.saveError")}</AlertTitle>
            <AlertDescription>{t("termStatus.saveErrorDescription")}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="term-status">{t("termStatus.newStatus")}</Label>
          <Select
            value={to}
            disabled={mutation.isPending}
            onValueChange={(value) => {
              setTo(value as TermStatus)
              setIsOverCapacity(value === "CONFIRMED" && isFull)
              setIsOverCapacityConfirmed(false)
              mutation.reset()
            }}
          >
            <SelectTrigger
              id="term-status"
              className="h-12 w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowed.map((status) => (
                <SelectItem
                  key={status}
                  value={status}
                >
                  {t(
                    status === "CONFIRMED"
                      ? term.confirmationDueCzk > 0
                        ? "termStatus.confirmedWithDebt"
                        : "termStatus.confirmedPaid"
                      : `termStatus.state.${status}`,
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {term.status === "WAITLISTED" ? <p>{t("termStatus.allowedChanges")}</p> : null}
        {isOverCapacity ? (
          <>
            <Alert variant="destructive">
              <AlertTriangle aria-hidden />
              <AlertTitle className="line-clamp-none">
                {t("termStatus.overCapacityTitle")}
              </AlertTitle>
              <AlertDescription>
                {t("termStatus.overCapacityDescription", {
                  occupied: term.confirmationOccupied,
                  capacity: term.confirmationCapacity,
                  next: term.confirmationNextOccupied,
                })}
              </AlertDescription>
            </Alert>
            <div className="flex items-start gap-3">
              <Checkbox
                id="over-capacity"
                className="size-6"
                checked={isOverCapacityConfirmed}
                disabled={mutation.isPending}
                onCheckedChange={(checked) => setIsOverCapacityConfirmed(checked === true)}
              />
              <Label
                htmlFor="over-capacity"
                className="leading-6"
              >
                {t("termStatus.capacityConsent")}
              </Label>
            </div>
          </>
        ) : !mutation.isPending && !hasError ? (
          <Alert variant={to === "CANCELLED" ? "destructive" : "default"}>
            <AlertTitle className="line-clamp-none">{t(`termStatus.impact.${to}`)}</AlertTitle>
            <AlertDescription>
              {to === "CONFIRMED"
                ? t("termStatus.confirmImpact", {
                    occupied: term.confirmationOccupied,
                    capacity: term.confirmationCapacity,
                    next: term.confirmationNextOccupied,
                    price: formatCzk(term.confirmationDueCzk),
                  })
                : t(to === "CANCELLED" ? "termStatus.cancelImpact" : "termStatus.waitlistImpact")}
            </AlertDescription>
          </Alert>
        ) : null}
        {!mutation.isPending ? (
          <p className="text-sm text-muted-foreground">{t("termStatus.changeNotice")}</p>
        ) : null}
        <DialogFooter className="flex-col gap-4 sm:flex-row">
          {!mutation.isPending ? (
            <Button
              variant="ghost"
              size="lg"
              className="h-12 sm:flex-1"
              onClick={onClose}
            >
              {t("termStatus.cancel")}
            </Button>
          ) : null}
          <Button
            size="lg"
            className="h-12 sm:flex-1"
            variant={to === "CANCELLED" ? "destructive" : "default"}
            disabled={mutation.isPending || (isOverCapacity && !isOverCapacityConfirmed)}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <LogoSymbol
                aria-hidden
                className="size-6 animate-spin"
              />
            ) : null}
            {t(
              mutation.isPending
                ? "termStatus.saving"
                : hasError
                  ? "termStatus.retry"
                  : to === "CANCELLED"
                    ? "termStatus.cancelSubmit"
                    : "termStatus.save",
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
