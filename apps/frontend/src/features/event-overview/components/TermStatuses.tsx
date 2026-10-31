import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateRange, formatDateTime } from "@/lib/date"

import {
  termStatusesQueryOptions,
  type TermStatus,
  type TermStatusDetail,
} from "@/features/event-overview/api/termStatus"
import { TermStatusChange } from "@/features/event-overview/components/TermStatusChange"

const BADGE = { CONFIRMED: "success", WAITLISTED: "secondary", CANCELLED: "secondary" } as const
const ACTION_KEY = {
  CONFIRMED: "confirm",
  WAITLISTED: "waitlist",
  CANCELLED: "cancel",
} as const satisfies Record<TermStatus, string>

/**
 * US-28: status of the application in every term, with the manual changes the status diagram
 * allows and the system log of past changes (who, when, from which status to which).
 * No Figma frame exists for this block yet; built from the kit following DESIGN.md.
 */
export function TermStatuses({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("eventOverview")
  const { data, isPending, error, refetch } = useQuery(termStatusesQueryOptions(applicationId))
  const [change, setChange] = useState<{ term: TermStatusDetail; to: TermStatus } | null>(null)
  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("termStatus.errorTitle")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }
  return (
    <Card className="gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("termStatus.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("termStatus.helper")}</p>
      </div>
      <ul className="flex flex-col">
        {data.map((term) => (
          <li
            key={term.termId}
            className="flex flex-col gap-3 border-t py-4 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-medium">
                {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
              </span>
              <Badge variant={BADGE[term.status]}>{t(`termStatus.state.${term.status}`)}</Badge>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                {term.allowedStatuses.map((status) => (
                  <Button
                    key={status}
                    variant={status === "CANCELLED" ? "outline" : "default"}
                    onClick={() => setChange({ term, to: status })}
                  >
                    {t(`termStatus.action.${ACTION_KEY[status]}`)}
                  </Button>
                ))}
              </div>
            </div>
            {term.history.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {term.history.map((entry) => (
                  <li key={entry.id}>
                    {t("termStatus.logEntry", {
                      date: formatDateTime(entry.changedAt),
                      who: entry.changedByName ?? t("termStatus.system"),
                      from: t(`termStatus.state.${entry.fromStatus}`),
                      to: t(`termStatus.state.${entry.toStatus}`),
                    })}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
      {change ? (
        <TermStatusChange
          applicationId={applicationId}
          term={change.term}
          to={change.to}
          onClose={() => setChange(null)}
        />
      ) : null}
    </Card>
  )
}
