import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

export type SubstituteTerm = { id: string; startsOn: string; endsOn: string }
/** The bed is taken meanwhile: what the "bed already taken" screen needs to say. */
export type SubstituteTaken = { name: string; range: string; beds: string }

type BedKind = "Male" | "Female" | "Shared"
const bedKind = (list: SubstituteList, gender: Substitute["gender"]): BedKind =>
  list.roomMode === "SHARED" ? "Shared" : gender === "MALE" ? "Male" : "Female"

/** Free beds of the term as the Figma context line says it: per gender, or the one common pool. */
function freeBedsLabel(list: SubstituteList, t: TFunction<"eventOverview">): string {
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
// The list looks like the applications list (table, cards on mobile), without its filters.
export function SubstitutesPanel({
  eventId,
  term,
  onConfirmed,
  onTaken,
}: {
  eventId: string
  term: SubstituteTerm
  onConfirmed: (applicationId: string) => void
  onTaken: (taken: SubstituteTaken) => void
}) {
  const { t } = useTranslation("eventOverview")
  const query = useQuery(substitutesQueryOptions(eventId, term.id))
  const [chosen, setChosen] = useState<Substitute | null>(null)
  const list = query.data
  if (!list || list.evaluationMode !== "MANUAL" || list.items.length === 0) return null
  const range = formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })
  // Men and women wait for different beds, so they are listed apart; shared rooms have one queue.
  const groups =
    list.roomMode === "SHARED"
      ? [{ key: "shared", title: null, items: list.items }]
      : (["MALE", "FEMALE"] as const)
          .map((gender) => ({
            key: gender,
            title: t(gender === "MALE" ? "substitutes.groupMale" : "substitutes.groupFemale"),
            items: list.items.filter((item) => item.gender === gender),
          }))
          .filter((group) => group.items.length > 0)
  return (
    <section
      aria-label={t("substitutes.list")}
      className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm md:p-6"
    >
      <p>
        {range} · {freeBedsLabel(list, t)}
      </p>
      <p className="text-sm text-muted-foreground">{t("substitutes.hint")}</p>
      <p className="text-sm text-muted-foreground">{t("applications.sortQueue")}</p>
      {groups.map((group) => (
        <SubstituteGroup
          key={group.key}
          title={group.title}
          items={group.items}
          range={range}
          onChoose={setChosen}
        />
      ))}
      {chosen && (
        <ConfirmSubstituteDialog
          eventId={eventId}
          term={term}
          list={list}
          substitute={chosen}
          onClose={() => setChosen(null)}
          onConfirmed={(applicationId) => {
            setChosen(null)
            onConfirmed(applicationId)
          }}
          onTaken={(taken) => {
            setChosen(null)
            onTaken(taken)
          }}
        />
      )}
    </section>
  )
}

const label = (item: Substitute) => `${item.firstName} ${item.lastName}`

/** One queue of substitutes: a table on desktop, a list on mobile, in order of receipt. */
function SubstituteGroup({
  title,
  items,
  range,
  onChoose,
}: {
  title: string | null
  items: Substitute[]
  range: string
  onChoose: (item: Substitute) => void
}) {
  const { t } = useTranslation("eventOverview")
  return (
    <div className="flex flex-col gap-2">
      {title && <h3 className="text-base font-semibold">{title}</h3>}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {(["participant", "terms", "submitted", "actions"] as const).map((key) => (
                <TableHead key={key}>{t(`applications.${key}`)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.applicationId}>
                <TableCell>
                  <p className="font-medium">{label(item)}</p>
                  <Person item={item} />
                </TableCell>
                <TableCell>
                  <TermStatus
                    item={item}
                    range={range}
                  />
                </TableCell>
                <TableCell>{formatDateTime(item.submittedAt)}</TableCell>
                <TableCell>
                  <ConfirmButton
                    item={item}
                    onChoose={onChoose}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="divide-y md:hidden">
        {items.map((item) => (
          <li
            key={item.applicationId}
            className="flex flex-col items-start gap-2 py-3"
          >
            <span className="font-medium">{label(item)}</span>
            <Person item={item} />
            <TermStatus
              item={item}
              range={range}
            />
            <ConfirmButton
              item={item}
              onChoose={onChoose}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A row action: `outline`, since the one primary button of the view is the dialog's. */
function ConfirmButton({
  item,
  onChoose,
}: {
  item: Substitute
  onChoose: (item: Substitute) => void
}) {
  const { t } = useTranslation("eventOverview")
  return (
    <Button
      variant="outline"
      aria-label={`${t("substitutes.confirm")}: ${label(item)}`}
      onClick={() => onChoose(item)}
    >
      {t("substitutes.confirm")}
    </Button>
  )
}

function Person({ item }: { item: Substitute }) {
  const { t } = useTranslation("eventOverview")
  return (
    <p className="text-xs wrap-anywhere text-muted-foreground">
      {formatDate(item.birthDate)} ·{" "}
      {t(item.gender === "FEMALE" ? "applications.female" : "applications.male")} · {item.email}
    </p>
  )
}

/** The term and the purple waitlist chip, "Náhradník" or "Náhradnice" with the position. */
function TermStatus({ item, range }: { item: Substitute; range: string }) {
  const { t } = useTranslation("eventOverview")
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>{range}</span>
      <Badge
        variant="secondary"
        className="bg-status-waitlist-bg text-status-waitlist"
      >
        {t(
          item.gender === "FEMALE"
            ? "applications.waitlistedPositionFemale"
            : "applications.waitlistedPositionMale",
          { position: item.position },
        )}
      </Badge>
    </div>
  )
}

// Figma (Design system): US-104 Přihlášky · Dialog: Potvrdit náhradníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15780-5656 (mobile 15780-5751)
function ConfirmSubstituteDialog({
  eventId,
  term,
  list,
  substitute,
  onClose,
  onConfirmed,
  onTaken,
}: {
  eventId: string
  term: SubstituteTerm
  list: SubstituteList
  substitute: Substitute
  onClose: () => void
  onConfirmed: (applicationId: string) => void
  onTaken: (taken: SubstituteTaken) => void
}) {
  const { t } = useTranslation("eventOverview")
  const client = useQueryClient()
  const kind = bedKind(list, substitute.gender)
  const free = kind === "Female" ? list.freeBeds.FEMALE : list.freeBeds.MALE
  const name = `${substitute.firstName} ${substitute.lastName}`
  const range = formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })
  const confirm = useMutation({
    mutationFn: () => confirmSubstitute(eventId, term.id, substitute.applicationId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["eventOverview"] })
      onConfirmed(substitute.applicationId)
    },
    onError: (error) => {
      // Someone took the bed since the list was shown: the list is stale, show it as such.
      if (apiErrorCode(error) === "BED_ALREADY_TAKEN") {
        void client.invalidateQueries({ queryKey: ["eventOverview"] })
        onTaken({ name, range, beds: t(`substitutes.free${kind}`, { count: 0 }) })
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
          term: range,
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
