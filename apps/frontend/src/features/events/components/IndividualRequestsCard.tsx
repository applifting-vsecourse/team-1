import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { individualRequestsQueryOptions } from "@/features/events/api/individual-requests"
import { participantName } from "@/features/events/components/room-assignment-labels"

// The third view of the accommodation: who asked to settle the accommodation individually in the term and what they wrote (#514).
// Figma (Design system v2): #514 / Požadavky ve vybraném termínu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27282-163381 (mobile 27282-163930)
// Figma (Design system v2): #514 / Vybraný termín bez požadavků · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27282-164406 (mobile 27282-164938)
export function IndividualRequestsCard({ eventId, termId }: { eventId: string; termId: string }) {
  const { t } = useTranslation("events")
  const query = useQuery(individualRequestsQueryOptions(eventId, termId))
  // A failed refetch keeps the last data in the cache, but a list that may be stale must not look current.
  if (query.isError || !query.data) {
    return query.isError ? (
      <ErrorState
        title={t("rooms.loadFailed")}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    ) : (
      <LoadingState />
    )
  }
  const { requests } = query.data
  return (
    <Card className="gap-3 p-4">
      <h3 className="text-xl font-semibold">{t("individualRequests.title")}</h3>
      {requests.length === 0 ? (
        <p>{t("individualRequests.none")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((item) => {
            const name = participantName(item)
            return (
              <li
                key={item.applicationTermId}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0 break-words">
                  <p className="text-sm text-muted-foreground">{name}</p>
                  {item.request ? <p className="whitespace-pre-wrap">{item.request}</p> : null}
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="max-sm:self-start"
                >
                  <Link
                    to={ROUTES.organizer.application}
                    params={{ eventId, applicationId: item.applicationId }}
                    aria-label={t("individualRequests.openApplication", { name })}
                  >
                    {t("individualRequests.openApplicationShort")}
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
