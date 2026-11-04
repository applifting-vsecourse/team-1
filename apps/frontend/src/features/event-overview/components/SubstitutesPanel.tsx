import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { TFunction } from "i18next"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiErrorCode } from "@/lib/api-client"
import { formatDate, formatDateRange, formatDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import {
  confirmSubstitute,
  substitutesQueryOptions,
  type Substitute,
  type SubstituteList,
} from "@/features/event-overview/api/substitutes"
import { BulkActionDialog } from "@/features/event-overview/components/BulkActionDialog"
import type { SubstituteOutcomeData } from "@/features/event-overview/components/SubstituteOutcome"

export type SubstituteTerm = { id: string; startsOn: string; endsOn: string }

type BedKind = "Male" | "Female" | "Shared"
const bedKind = (list: SubstituteList, gender: Substitute["gender"]): BedKind =>
  list.roomMode === "SHARED" ? "Shared" : gender === "MALE" ? "Male" : "Female"

/** Free beds of the term as the Figma context line says it: per gender, or the one common pool. */
export function freeBedsLabel(list: SubstituteList, t: TFunction<"eventOverview">): string {
  if (list.roomMode === "SHARED") return t("substitutes.freeShared", { count: list.freeBeds.MALE })
  return [
    list.freeBeds.MALE > 0 && t("substitutes.freeMale", { count: list.freeBeds.MALE }),
    list.freeBeds.FEMALE > 0 && t("substitutes.freeFemale", { count: list.freeBeds.FEMALE }),
  ]
    .filter(Boolean)
    .join(" · ")
}

// Figma (Design system): US-104 Přihlášky · Vhodní náhradníci · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15780-5459 (mobile 15780-5571)
// Shown above the waitlist of one term when a bed is free and the event is evaluated by hand.
export function SubstitutesPanel({
  eventId,
  term,
  onOutcome,
}: {
  eventId: string
  term: SubstituteTerm
  onOutcome: (outcome: SubstituteOutcomeData) => void
}) {
  const { t } = useTranslation("eventOverview")
  const query = useQuery(substitutesQueryOptions(eventId, term.id))
  const [chosen, setChosen] = useState<Substitute | null>(null)
  const list = query.data
  if (!list || list.evaluationMode !== "MANUAL" || list.items.length === 0) return null
  const range = formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })
  return (
    <section
      aria-label={t("substitutes.list")}
      className="flex flex-col gap-4"
    >
      <p>
        {range} · {freeBedsLabel(list, t)}
      </p>
      <p className="text-muted-foreground">{t("substitutes.hint")}</p>
      <ul className="flex flex-col gap-3">
        {list.items.map((item) => (
          <li
            key={item.applicationId}
            className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm md:flex-row md:items-start"
          >
            <div className="flex flex-col gap-2 md:w-64">
              <p>
                {item.firstName} {item.lastName}
              </p>
              <p className="text-sm">
                {formatDate(item.birthDate)} ·{" "}
                {t(item.gender === "FEMALE" ? "applications.female" : "applications.male")}
              </p>
              <p className="text-sm break-all">{item.email}</p>
              <p className="text-sm">
                {t("substitutes.received", { date: formatDateTime(item.submittedAt) })}
              </p>
            </div>
            <div className="flex flex-1 flex-col items-start gap-2">
              <p>{range}</p>
              <Badge
                variant="secondary"
                className="bg-accent text-muted-foreground"
              >
                {t("applications.waitlisted")}
              </Badge>
            </div>
            <Button
              size="lg"
              className="h-12 md:min-w-48"
              aria-label={`${t("substitutes.confirm")}: ${item.firstName} ${item.lastName}`}
              onClick={() => setChosen(item)}
            >
              {t("substitutes.confirm")}
              <ChevronRight aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      {chosen && (
        <ConfirmSubstituteDialog
          eventId={eventId}
          term={term}
          list={list}
          substitute={chosen}
          onClose={() => setChosen(null)}
          onOutcome={(outcome) => {
            setChosen(null)
            onOutcome(outcome)
          }}
        />
      )}
    </section>
  )
}

// Figma (Design system): US-104 Přihlášky · Dialog: Potvrdit náhradníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15780-5656 (mobile 15780-5751)
export function ConfirmSubstituteDialog({
  eventId,
  term,
  list,
  substitute,
  onClose,
  onOutcome,
}: {
  eventId: string
  term: SubstituteTerm
  list: SubstituteList
  substitute: Substitute
  onClose: () => void
  onOutcome: (outcome: SubstituteOutcomeData) => void
}) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const kind = bedKind(list, substitute.gender)
  const free = kind === "Female" ? list.freeBeds.FEMALE : list.freeBeds.MALE
  const name = `${substitute.firstName} ${substitute.lastName}`
  const confirm = useMutation({
    mutationFn: () => confirmSubstitute(eventId, term.id, substitute.applicationId),
    onSuccess: (confirmation) => {
      void client.invalidateQueries({ queryKey: ["eventOverview"] })
      onOutcome({
        kind: "done",
        substitute,
        confirmation,
        term,
        bed: kind,
        freeLeft: Math.max(0, free - 1),
      })
    },
    onError: (error) => {
      // Someone took the bed since the list was shown: the list is stale, show it as such.
      if (apiErrorCode(error) === "BED_ALREADY_TAKEN") {
        void client.invalidateQueries({ queryKey: ["eventOverview"] })
        onOutcome({ kind: "taken", substitute, term, bed: kind })
      }
    },
  })
  return (
    <BulkActionDialog
      title={t("substitutes.dialogTitle", { name })}
      isBusy={confirm.isPending}
      onClose={onClose}
      submit={
        <Button
          size="lg"
          className="h-12 md:min-w-40"
          disabled={confirm.isPending}
          onClick={() => confirm.mutate()}
        >
          {t("substitutes.dialogSubmit")}
        </Button>
      }
    >
      <p>
        {t(free <= 1 ? "substitutes.dialogBodyLast" : "substitutes.dialogBodyMore", {
          bed: t(`substitutes.bed${kind}`),
          term: formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }),
          price: formatCzk(substitute.priceCzk),
        })}
      </p>
      {confirm.isError && apiErrorCode(confirm.error) !== "BED_ALREADY_TAKEN" && (
        <Alert variant="destructive">
          <AlertDescription>{confirm.error.message}</AlertDescription>
        </Alert>
      )}
    </BulkActionDialog>
  )
}
