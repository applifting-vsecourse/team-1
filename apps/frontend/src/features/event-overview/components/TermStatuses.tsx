import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { LogOut } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"
import { termDatesLine } from "@/lib/term-label"

import {
  termStatusesQueryOptions,
  type TermStatus,
  type TermStatusDetail,
} from "@/features/event-overview/api/termStatus"
import { OrganizerTermChange } from "@/features/event-overview/components/OrganizerTermChange"
import { OrganizerWithdrawal } from "@/features/event-overview/components/OrganizerWithdrawal"
import { TermStatusChange } from "@/features/event-overview/components/TermStatusChange"

const BADGE = {
  TO_EVALUATE: "secondary",
  CONFIRMED: "success",
  WAITLISTED: "secondary",
  CANCELLED: "secondary",
  ARCHIVED: "secondary",
} as const
const ACTION_KEY = {
  CONFIRMED: "confirm",
  WAITLISTED: "waitlist",
  CANCELLED: "cancel",
} as const satisfies Record<TermStatus, string>

/** Leaving a term is a destructive action: solid red with a visibly darker hover. */
const NEGATIVE = "transition-colors hover:bg-destructive/75"
/** Buttons after the withdrawal, in this order: the confirming action is always the last one. */
const POSITIVE = ["WAITLISTED", "CONFIRMED"] as const satisfies TermStatus[]

/**
 * US-28: status of the application in every term, with the manual changes the status diagram
 * allows and the system log of past changes (who, when, from which status to which).
 * No Figma frame exists for this block yet; built from the kit following DESIGN.md.
 */
export function TermStatuses({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("eventOverview")
  const { data, isPending, error, refetch } = useQuery(termStatusesQueryOptions(applicationId))
  const [change, setChange] = useState<{ term: TermStatusDetail; to: TermStatus } | null>(null)
  // US-32: the term the withdrawal dialog opens on; `null` there means the whole application.
  const [withdrawal, setWithdrawal] = useState<{ termId: string | null } | null>(null)
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
  const active = data.filter((term) => term.status !== "CANCELLED")
  return (
    <Card className="gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("termStatus.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("termStatus.helper")}</p>
      </div>
      {active.length > 1 ? (
        <div className="flex border-b pb-4">
          <Button
            variant="destructive"
            className={NEGATIVE}
            onClick={() => setWithdrawal({ termId: null })}
          >
            <LogOut aria-hidden />
            {t("withdrawal.triggerWhole")}
          </Button>
        </div>
      ) : null}
      <ul className="flex flex-col">
        {data.map((term) => (
          <li
            key={term.termId}
            className="flex flex-col gap-3 border-t py-4 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-medium">{termDatesLine(term)}</span>
              <Badge variant={BADGE[term.status]}>{t(`termStatus.state.${term.status}`)}</Badge>
              {term.status === "CANCELLED" ? null : (
                <div className="flex flex-wrap gap-2 sm:ml-auto">
                  <OrganizerTermChange
                    applicationId={applicationId}
                    term={term}
                  />
                  {/* US-32: a confirmed or waitlisted term is left through the withdrawal. */}
                  {term.status === "CONFIRMED" || term.status === "WAITLISTED" ? (
                    <Button
                      variant="destructive"
                      className={NEGATIVE}
                      onClick={() => setWithdrawal({ termId: term.termId })}
                    >
                      {t("withdrawal.trigger")}
                    </Button>
                  ) : term.allowedStatuses.includes("CANCELLED") ? (
                    <Button
                      variant="destructive"
                      className={NEGATIVE}
                      onClick={() => setChange({ term, to: "CANCELLED" })}
                    >
                      {t("termStatus.action.cancel")}
                    </Button>
                  ) : null}
                  {POSITIVE.filter((status) => term.allowedStatuses.includes(status)).map(
                    (status) => (
                      <Button
                        key={status}
                        variant={status === "CONFIRMED" ? "success" : "outline"}
                        onClick={() => setChange({ term, to: status })}
                      >
                        {t(`termStatus.action.${ACTION_KEY[status]}`)}
                      </Button>
                    ),
                  )}
                </div>
              )}
            </div>
            {term.history.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {term.history.map((entry) => (
                  <li key={entry.id}>
                    {entry.kind === "CREATED_BY_ORGANIZER"
                      ? t("manual.historyEntry", {
                          date: formatDateTime(entry.changedAt),
                          name: entry.changedByName,
                        })
                      : t("termStatus.logEntry", {
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
      {withdrawal ? (
        <OrganizerWithdrawal
          applicationId={applicationId}
          terms={active}
          initialTermId={withdrawal.termId}
          onClose={() => setWithdrawal(null)}
        />
      ) : null}
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
