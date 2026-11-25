import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Pagination } from "@/components/molecules/Pagination"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { usePagination } from "@/hooks/usePagination"

import {
  myApplicationsQueryOptions,
  type MyApplication,
} from "@/features/participant/api/applications"
import { ApplicationCard } from "@/features/participant/components/ApplicationCard"

type ApplicationListProps = {
  /** The badge with new posts of an application (US-91); a route composes it, as features do not import each other. */
  renderBoardBadge?: (applicationId: string) => ReactNode
}

/** All applications under the signed-in account — loading, empty and error are all drawn here (DESIGN.md). */
// Figma (Design system v2): US-54 / Moje přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2 (360 px: node-id=15649-122; empty: 15649-449)
export function ApplicationList({ renderBoardBadge }: ApplicationListProps) {
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

  return (
    <Applications
      applications={data}
      renderBoardBadge={renderBoardBadge}
    />
  )
}

function Applications({
  applications,
  renderBoardBadge,
}: {
  applications: MyApplication[]
  renderBoardBadge?: (applicationId: string) => ReactNode
}) {
  const { t } = useTranslation("participant")
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
      {pageItems.map((application) => {
        const due = application.paymentDetails?.summary.payableCzk
        return due !== undefined && due > 0 ? (
          <Alert
            key={application.id}
            role="note"
            className="bg-secondary"
          >
            <TriangleAlert aria-hidden />
            <AlertTitle>
              {t("list.remaining")} <MoneyAmount amountCzk={due} />
            </AlertTitle>
            <AlertDescription>
              {application.firstName} {application.lastName} · {application.eventName}.{" "}
              {t("list.paymentNote")}
            </AlertDescription>
          </Alert>
        ) : null
      })}
      {Array.from(groups, ([id, group]) => (
        <section
          key={id}
          className="flex flex-col gap-4"
        >
          <h2 className="text-2xl font-semibold">{group[0].eventName}</h2>
          <ul className="flex flex-col gap-4">
            {group.map((application) => (
              <li key={application.id}>
                <ApplicationCard
                  application={application}
                  boardBadge={renderBoardBadge?.(application.id)}
                />
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
