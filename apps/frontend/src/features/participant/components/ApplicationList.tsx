import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Pagination } from "@/components/molecules/Pagination"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { usePagination } from "@/hooks/usePagination"
import { todayIsoInAppZone } from "@/lib/date-input"

import {
  myApplicationsQueryOptions,
  type MyApplication,
} from "@/features/participant/api/applications"
import { ApplicationCard } from "@/features/participant/components/ApplicationCard"

/** All applications under the signed-in account — loading, empty and error are all drawn here (DESIGN.md). */
// Figma (Design system v2): US-54 / Moje přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2 (360 px: node-id=15649-122; empty: 15649-449)
export function ApplicationList() {
  const { t } = useTranslation("participant")
  const { data, isPending, error, refetch } = useQuery(myApplicationsQueryOptions())

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("list.errorTitle")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }
  if (data.length === 0) return <EmptyState message={t("list.empty")} />

  return <Applications applications={data} />
}

function Applications({ applications }: { applications: MyApplication[] }) {
  const { pageItems, ...pagination } = usePagination(applications)
  const groups = new Map<string, [MyApplication, ...MyApplication[]]>()
  for (const application of pageItems) {
    const key = application.eventId ?? application.id
    const group = groups.get(key)
    if (group) group.push(application)
    else groups.set(key, [application])
  }
  return (
    <div className="flex flex-col gap-6">
      <PaymentReminders applications={applications} />
      {Array.from(groups, ([id, group]) => (
        <section
          key={id}
          className="flex flex-col gap-4"
        >
          <h2 className="text-2xl font-semibold">{group[0].eventName}</h2>
          <ul className="flex flex-col gap-4">
            {group.map((application) => (
              <li key={application.id}>
                <ApplicationCard application={application} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Pagination
        {...pagination}
        onPageChange={pagination.setPage}
      />
    </div>
  )
}

function PaymentReminders({ applications }: { applications: MyApplication[] }) {
  const { t } = useTranslation("participant")
  const [isExpanded, setExpanded] = useState(false)
  const moreId = useId()
  const today = todayIsoInAppZone()

  const reminders = applications.flatMap((application) => {
    const payment = application.paymentDetails
    if (!payment || payment.summary.payableCzk <= 0) return []

    const unpaidIds = new Set(payment.terms.filter((term) => term.owedCzk > 0).map((term) => term.termId))
    let nextDate: string | undefined
    let lastEnd: string | undefined
    for (const term of application.terms) {
      if (!unpaidIds.has(term.termId)) continue
      if (term.endsOn >= today) {
        const date = term.startsOn < today ? today : term.startsOn
        if (nextDate === undefined || date < nextDate) nextDate = date
      } else if (lastEnd === undefined || term.endsOn > lastEnd) {
        lastEnd = term.endsOn
      }
    }

    return [{ application, due: payment.summary.payableCzk, nextDate, lastEnd }]
  })
  // A current or upcoming debt comes first. Keep past and undated reminders available.
  reminders.sort(
    (a, b) =>
      Number(!a.nextDate) - Number(!b.nextDate) ||
      (a.nextDate ?? "").localeCompare(b.nextDate ?? "") ||
      (b.lastEnd ?? "").localeCompare(a.lastEnd ?? ""),
  )

  const [first, ...more] = reminders
  if (!first) return null

  const renderReminder = ({ application, due }: (typeof reminders)[number]) => (
    <Alert key={application.id} role="note" className="bg-secondary">
      <TriangleAlert aria-hidden />
      <AlertTitle>
        {t("list.remaining")} <MoneyAmount amountCzk={due} />
      </AlertTitle>
      <AlertDescription>
        {application.firstName} {application.lastName} · {application.eventName}.{" "}
        {t("list.paymentNote")}
      </AlertDescription>
    </Alert>
  )

  return (
    <div className="flex flex-col gap-4">
      {renderReminder(first)}
      {more.length > 0 && (
        <>
          <Button
            variant="outline"
            size="lg"
            className="self-start"
            aria-expanded={isExpanded}
            aria-controls={moreId}
            onClick={() => setExpanded((isOpen) => !isOpen)}
          >
            {isExpanded ? t("list.hidePaymentReminders") : t("list.showMorePaymentReminders", { count: more.length })}
          </Button>
          <div id={moreId} hidden={!isExpanded}>
            {isExpanded && <div className="flex flex-col gap-4">{more.map(renderReminder)}</div>}
          </div>
        </>
      )}
    </div>
  )
}
