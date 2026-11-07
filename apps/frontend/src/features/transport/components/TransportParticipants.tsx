import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Card } from "@/components/ui/card"
import { termTitle } from "@/lib/term-label"

import {
  OWN_TRANSPORT_ID,
  transportParticipantsQueryOptions,
} from "@/features/transport/api/transport"

// Participants of one way of transport, one block per term.
// Figma (Design system): #65 Autobus z Prahy · Účastníci · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-13135
// Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-13270
export function TransportParticipants({
  eventId,
  transportId,
}: {
  eventId: string
  transportId: string
}) {
  const { t } = useTranslation("transport")
  const query = useQuery(transportParticipantsQueryOptions(eventId, transportId))

  if (!query.data) {
    return query.isError ? (
      <ErrorState
        title={t("loadFailed")}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    ) : (
      <LoadingState />
    )
  }
  const name = transportId === OWN_TRANSPORT_ID ? t("own") : (query.data.name ?? "")
  const title = t("participantsTitle", { name })

  return (
    <div className="flex flex-col gap-6">
      <Seo title={title} />
      <BackLink
        to={ROUTES.organizer.eventTransport}
        params={{ eventId }}
      >
        {t("back")}
      </BackLink>
      <SectionHeader title={title} />
      {query.data.groups.length === 0 ? <EmptyState message={t("noParticipants")} /> : null}
      {query.data.groups.map((group) => (
        <Card
          key={group.termId}
          className="gap-4 p-4"
        >
          <h3 className="text-xl font-semibold">
            {t("termParticipants", {
              term: termTitle({ ...group, name: group.termName }),
              count: group.participants.length,
            })}
          </h3>
          {group.participants.map((participant) => (
            <p key={participant.applicationId}>
              {participant.name} · {participant.email}
            </p>
          ))}
        </Card>
      ))}
    </div>
  )
}
