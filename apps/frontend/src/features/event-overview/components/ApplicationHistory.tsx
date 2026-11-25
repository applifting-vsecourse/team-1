import type { UseQueryResult } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Card } from "@/components/ui/card"
import { formatDate, formatDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termTitle } from "@/lib/term-label"

import type { HistoryEntry } from "@/features/event-overview/api/applicationHistory"

/**
 * US-53: every change of the application with its time, author and what changed — the creation,
 * the status in a term, the recorded payments and the edits of the details, newest first. The author is the person who made
 * the change, the system for an automatic one. The server decides what the history holds.
 */
// Figma v2: US-53 Detail účastníka · Historie změn · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22475-86190 (mobile 22475-86352)
export function ApplicationHistory({
  query: { data, isPending, error, refetch },
}: {
  query: UseQueryResult<HistoryEntry[]>
}) {
  const { t } = useTranslation("eventOverview")
  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("history.errorTitle")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  const describe = (entry: HistoryEntry): string => {
    if (entry.kind === "APPLICATION_CREATED") return t("history.created")
    if (entry.kind === "EDIT") {
      const value = (field: string, text: string | null | undefined): string => {
        if (text === null || text === undefined) return t("history.emptyValue")
        if (field === "birthDate") return formatDate(text)
        if (field === "individualAccommodation") {
          return t(text === "true" ? "history.yes" : "history.no")
        }
        return text
      }
      return t("history.edit", {
        changes: entry.changes
          .map(({ field, from, to }) => {
            if (field === "accommodationRequest") return t("history.noteChanged")
            if (field === "pronouns") return t("history.pronounsChanged")
            return t("history.change", {
              field: t(`history.field.${field}`),
              from: value(field, from),
              to: value(field, to),
            })
          })
          .join("; "),
      })
    }
    if (entry.kind === "STATUS_CHANGE") {
      return t("history.status", {
        term: termTitle({ name: entry.termName, startsOn: entry.startsOn, endsOn: entry.endsOn }),
        from: t(`termStatus.state.${entry.fromStatus}`),
        to: t(`termStatus.state.${entry.toStatus}`),
      })
    }
    const isRefund = entry.amountCzk < 0
    const amount = `${isRefund ? "" : "+"}${formatCzk(entry.amountCzk)}`
    const notes = [
      entry.isCorrection ? t("payment.correctionHistory") : null,
      entry.isCancelled ? t("payment.cancelledHistory") : null,
    ].filter(Boolean)
    return [t(isRefund ? "history.refund" : "history.payment", { amount }), ...notes].join(" · ")
  }

  return (
    <Card className="gap-4 p-4 md:p-6">
      <h2 className="text-lg font-semibold">{t("history.title")}</h2>
      <ul className="flex flex-col gap-3">
        {data.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-col gap-0.5"
          >
            <p>{describe(entry)}</p>
            <p className="text-xs text-muted-foreground">
              {t("history.entry", {
                date: formatDateTime(entry.at),
                who: entry.author ?? t("history.system"),
              })}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
