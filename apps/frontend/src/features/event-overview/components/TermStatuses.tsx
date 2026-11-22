import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { LogOut } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termDates, termName, termTitle } from "@/lib/term-label"

import {
  termStatusesQueryOptions,
  type TermStatusDetail,
} from "@/features/event-overview/api/termStatus"
import { OrganizerTermChange } from "@/features/event-overview/components/OrganizerTermChange"
import { OrganizerWithdrawal } from "@/features/event-overview/components/OrganizerWithdrawal"
import { TermStatusChange } from "@/features/event-overview/components/TermStatusChange"

/** Leaving a term is a destructive action: solid red with a visibly darker hover. */
const NEGATIVE = "transition-colors hover:bg-destructive/75"
// Figma (Design system): #244 Stav v termínech · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19799-67758 (mobile: 19799-67905)
// Figma (Design system): #364 Detail přihlášky · pořadí u termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22642-89925 (360 px: 22642-90090)
// Empty: 19799-67980 / 19799-68116. Existing withdrawal, term change and audit history remain available.
export function TermStatuses({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("eventOverview")
  const { data, isPending, error, refetch } = useQuery(termStatusesQueryOptions(applicationId))
  const [change, setChange] = useState<TermStatusDetail | null>(null)
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
  const active = data.filter((term) => term.status !== "CANCELLED" && term.status !== "ARCHIVED")
  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="term-statuses-title"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="term-statuses-title"
          className="text-2xl font-semibold tracking-tight"
        >
          {t(data.length === 0 ? "termStatus.emptyTitle" : "termStatus.title")}
        </h2>
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
      {data.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p>{t("termStatus.emptyDescription")}</p>
          <OrganizerTermChange
            applicationId={applicationId}
            term={null}
          />
        </div>
      ) : null}
      <ul className="flex flex-col gap-3">
        {data.map((term) => (
          <li
            key={term.termId}
            className="list-none"
          >
            <Card className="gap-2 p-3 sm:p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-lg font-semibold tracking-tight">
                  {termTitle(term)} ·{" "}
                  {t(
                    term.status === "CONFIRMED"
                      ? term.owedCzk > 0
                        ? "termStatus.confirmedWithDebt"
                        : "termStatus.confirmedPaid"
                      : `termStatus.state.${term.status}`,
                  )}
                </h3>
                {termName(term) ? (
                  <span className="text-sm font-medium tabular-nums">{termDates(term)}</span>
                ) : null}
              </div>
              {term.status === "WAITLISTED" && term.waitlistPosition !== null ? (
                <p className="text-sm font-bold">
                  {t("termStatus.waitlistPosition", { position: term.waitlistPosition })}
                </p>
              ) : null}
              <p>
                {t(
                  term.status === "CONFIRMED"
                    ? "termStatus.summary"
                    : "termStatus.summaryWithoutPrice",
                  {
                    occupied: term.occupied,
                    capacity: term.capacity,
                    price: formatCzk(term.priceCzk),
                    debt: formatCzk(term.debtCzk),
                  },
                )}
              </p>
              {term.allowedStatuses.some(
                (status) =>
                  term.status !== "CONFIRMED" || (status === "WAITLISTED" && term.owedCzk > 0),
              ) ? (
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-12 w-full"
                  onClick={() => setChange(term)}
                >
                  {t("termStatus.change")}
                </Button>
              ) : null}
              {term.status !== "CANCELLED" && term.status !== "ARCHIVED" ? (
                <div className="flex w-full flex-col gap-2 *:w-full sm:w-auto sm:flex-row sm:flex-wrap sm:*:w-auto">
                  <OrganizerTermChange
                    applicationId={applicationId}
                    term={term}
                  />
                  {term.status === "CONFIRMED" ? (
                    <Button
                      variant="destructive"
                      className={NEGATIVE}
                      onClick={() => setWithdrawal({ termId: term.termId })}
                    >
                      {t("withdrawal.trigger")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </Card>
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
          term={change}
          onClose={() => setChange(null)}
        />
      ) : null}
    </section>
  )
}
