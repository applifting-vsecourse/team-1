import type { UseQueryResult } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Card } from "@/components/ui/card"
import { formatDate, formatDateTime, formatTime } from "@/lib/date"
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
            return t("history.change", {
              field: t(`history.field.${field}`),
              from: value(field, from),
              to: value(field, to),
            })
          })
          .join("; "),
      })
    }
    if (entry.kind === "LOGISTICS") {
      const empty = t("history.emptyValue")
      // The values are tokens, names or instants: the screen says them in the language of the user.
      const wall = (value: string) => `${formatDate(value)} ${formatTime(value)}`
      const value = (text: string | null | undefined): string => {
        if (!text) return empty
        if (text === "@own") return t("history.logistics.own")
        if (text === "NO_WISHES") return t("history.logistics.noWishes")
        if (text === "NO_RESTRICTION") return t("history.logistics.noRestriction")
        if (text === "WRITTEN") return t("history.logistics.written")
        if (entry.field === "stay") {
          const [arrival, departure] = text.split("|")
          return [
            t("history.logistics.arrival", { value: arrival ? wall(arrival) : empty }),
            t("history.logistics.departure", { value: departure ? wall(departure) : empty }),
          ].join(", ")
        }
        return text
      }
      const term =
        entry.startsOn && entry.endsOn
          ? ` (${termTitle({ name: entry.termName ?? null, startsOn: entry.startsOn, endsOn: entry.endsOn })})`
          : ""
      const field = `${t(`history.logistics.field.${entry.field}`)}${term}`
      // The health note is never listed: only that it was written.
      return entry.field === "health"
        ? `${field}: ${value(entry.to)}`
        : t("history.change", { field, from: value(entry.from), to: value(entry.to) })
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
