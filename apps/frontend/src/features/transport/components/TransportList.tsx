import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { eventTransportQueryOptions, OWN_TRANSPORT_ID } from "@/features/transport/api/transport"
import { departureText } from "@/features/transport/lib/departure"

// Transport of an event: every way of getting there with a link to its participants.
// Figma (Design system): #65 Doprava · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12467
// Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12627
export function TransportList({ eventId }: { eventId: string }) {
  const { t } = useTranslation("transport")
  const query = useQuery(eventTransportQueryOptions(eventId))

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
  const { transports, eventLocation } = query.data

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("title")} />
      <SectionHeader title={t("title")} />
      {transports.map((transport) => (
        <Card
          key={transport.id}
          className="gap-4 p-4"
        >
          <h3 className="text-xl font-semibold">{transport.name}</h3>
          <p>{t("departure", { when: departureText(transport.departureAt, t("at")) })}</p>
          <p>{transport.departurePlace}</p>
          <p>{t("participants", { count: transport.participantsCount })}</p>
          <Button
            asChild
            variant="outline"
            size="lg"
          >
            <Link
              to={ROUTES.organizer.eventTransportEdit}
              params={{ eventId, transportId: transport.id }}
            >
              {t("edit")}
            </Link>
          </Button>
          <ParticipantsLink
            eventId={eventId}
            transportId={transport.id}
          />
        </Card>
      ))}
      <Card className="gap-4 p-4">
        <h3 className="text-xl font-semibold">{t("own")}</h3>
        {eventLocation ? <p>{eventLocation}</p> : null}
        <ParticipantsLink
          eventId={eventId}
          transportId={OWN_TRANSPORT_ID}
        />
      </Card>
      <Button
        asChild
        size="lg"
      >
        <Link
          to={ROUTES.organizer.eventTransportNew}
          params={{ eventId }}
        >
          {t("add")}
        </Link>
      </Button>
    </div>
  )
}

function ParticipantsLink({ eventId, transportId }: { eventId: string; transportId: string }) {
  const { t } = useTranslation("transport")
  return (
    <Button
      asChild
      variant="outline"
      size="lg"
    >
      <Link
        to={ROUTES.organizer.eventTransportParticipants}
        params={{ eventId, transportId }}
      >
        {t("showParticipants")}
      </Link>
    </Button>
  )
}
