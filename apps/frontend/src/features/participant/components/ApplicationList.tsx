import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"

import { myApplicationsQueryOptions } from "@/features/participant/api/applications"
import { ApplicationCard } from "@/features/participant/components/ApplicationCard"

/** All applications under the signed-in account — loading, empty and error are all drawn here (DESIGN.md). */
// Figma (Design system): U01 Přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12092-104
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

  return (
    <ul className="flex flex-col gap-8">
      {data.map((application) => (
        <li key={application.id}>
          <ApplicationCard application={application} />
        </li>
      ))}
    </ul>
  )
}
