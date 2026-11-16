import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termTitle } from "@/lib/term-label"

import {
  applicationHistoryQueryOptions,
  type HistoryEntry,
} from "@/features/event-overview/api/applicationHistory"

/**
 * US-53: every change of the application with its time, author and what changed — the creation,
 * the status in a term and the recorded payments, newest first. The author is the person who made
 * the change, the system for an automatic one. The server decides what the history holds.
 */
// Figma (Design system): #53 / Adam Dvořák / Desktop · Historie změn · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-50731 (mobile: 19786-50736)
export function ApplicationHistory({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("eventOverview")
  const { data, isPending, error, refetch } = useQuery(
    applicationHistoryQueryOptions(applicationId),
  )
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
      <ul className="flex flex-col gap-2 text-sm">
        {data.map((entry) => (
          <li key={entry.id}>
            {t("history.entry", {
              date: formatDateTime(entry.at),
              who: entry.author ?? t("history.system"),
              change: describe(entry),
            })}
          </li>
        ))}
      </ul>
    </Card>
  )
}
