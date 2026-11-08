import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { MapPin, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { termDates, termTitle } from "@/lib/term-label"

import {
  eventTransportQueryOptions,
  OWN_TRANSPORT_ID,
  type TermTransport,
} from "@/features/transport/api/transport"
import { TransportCard } from "@/features/transport/components/TransportCard"

// Transport of an event, term by term: every way of getting there with a link to its participants.
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
  const { terms, eventLocation } = query.data

  return (
    <div className="flex flex-col gap-8">
      <Seo title={t("title")} />
      <SectionHeader title={t("title")} />
      {terms.length === 0 ? <EmptyState message={t("noTerms")} /> : null}
      {terms.map((term) => (
        <TermSection
          key={term.termId}
          eventId={eventId}
          term={term}
          eventLocation={eventLocation}
          isOnlyTerm={terms.length === 1}
        />
      ))}
    </div>
  )
}

function TermSection({
  eventId,
  term,
  eventLocation,
  isOnlyTerm,
}: {
  eventId: string
  term: TermTransport
  eventLocation: string | null
  isOnlyTerm: boolean
}) {
  const { t } = useTranslation("transport")
  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby={`term-${term.termId}`}
    >
      <div className="flex flex-col gap-1">
        <h3
          id={`term-${term.termId}`}
          className="text-xl font-semibold tracking-tight"
        >
          {termTitle({ ...term, name: term.termName })}
        </h3>
        {term.termName ? <p className="text-sm text-muted-foreground">{termDates(term)}</p> : null}
      </div>
      {term.transports.map((transport) => (
        <TransportCard
          key={transport.id}
          eventId={eventId}
          transport={transport}
        />
      ))}
      <Card className="gap-4 p-4">
        <h4 className="text-lg font-semibold">{t("own")}</h4>
        <ul className="flex flex-col gap-2 text-sm">
          {eventLocation ? (
            <li className="flex items-start gap-2">
              <MapPin
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <span>{eventLocation}</span>
            </li>
          ) : null}
          <li className="flex items-start gap-2">
            <Users
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span>{t("participants", { count: term.ownCount })}</span>
          </li>
        </ul>
        <Button
          asChild
          variant="outline"
          size="lg"
        >
          <Link
            to={ROUTES.organizer.eventTransportParticipants}
            params={{ eventId, transportId: OWN_TRANSPORT_ID }}
            search={{ termId: term.termId }}
          >
            {t("showParticipants")}
          </Link>
        </Button>
      </Card>
      <Button
        asChild
        size="lg"
        variant={isOnlyTerm ? "default" : "outline"}
      >
        <Link
          to={ROUTES.organizer.eventTransportNew}
          params={{ eventId }}
          search={{ termId: term.termId }}
        >
          {t("add")}
        </Link>
      </Button>
    </section>
  )
}
