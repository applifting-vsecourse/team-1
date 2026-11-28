import { useId, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Pagination } from "@/components/molecules/Pagination"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePagination } from "@/hooks/usePagination"
import { termLine, termTitle } from "@/lib/term-label"

import {
  transportParticipantsQueryOptions,
  type TransportParticipant,
} from "@/features/transport/api/transport"

// Participants of one way of transport.
// Figma v2: US-65 Účastníci · Vlastní doprava · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21206-64991 (360 px: node-id=21206-65212)
export function TransportParticipants({
  eventId,
  transportId,
}: {
  eventId: string
  transportId: string
}) {
  const { t } = useTranslation("transport")
  const query = useQuery(transportParticipantsQueryOptions(eventId, transportId))
  const [search, setSearch] = useState("")

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
  const { participants, ...term } = query.data
  const name = query.data.kind === "OWN" ? t("own") : query.data.name
  const title = t("participantsTitle", { name })
  const termValue = { ...term, name: term.termName }
  const words = normalize(search).split(/\s+/).filter(Boolean)
  const shown = participants.filter((participant) =>
    words.every((word) => normalize(participant.name).includes(word)),
  )

  return (
    <div className="flex flex-col gap-6">
      <Seo title={title} />
      <div className="flex items-start gap-3 md:gap-4">
        <BackLink
          to={ROUTES.organizer.eventTransport}
          params={{ eventId }}
        >
          {t("back")}
        </BackLink>
        <div className="min-w-0 flex-1 wrap-anywhere">
          <SectionHeader
            title={title}
            description={termLine(termValue)}
          />
        </div>
      </div>
      {participants.length === 0 ? (
        <EmptyState message={t("noParticipants")} />
      ) : (
        <>
          <div className="relative md:max-w-84">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-[17px] size-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label={t("searchParticipant")}
              placeholder={t("searchParticipant")}
              className="pl-11"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <ParticipantTable
            key={transportId}
            participants={shown}
            summary={t("termParticipants", { term: termTitle(termValue), count: shown.length })}
            term={termLine(termValue)}
            resetKey={search}
          />
        </>
      )}
    </div>
  )
}

function ParticipantTable({
  participants,
  summary,
  term,
  resetKey,
}: {
  participants: TransportParticipant[]
  summary: string
  term: string
  resetKey: string
}) {
  const { t } = useTranslation("transport")
  const accordionId = useId()
  const { pageItems, ...pagination } = usePagination(participants, resetKey)
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const expanded = new Set(expandedIds)
  const participantIds = new Set(participants.map(({ applicationId }) => applicationId))
  const isEntireListExpanded = [...participantIds].every((id) => expanded.has(id))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite">{summary}</p>
        {participants.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-controls={accordionId}
            onClick={() =>
              setExpandedIds(
                isEntireListExpanded
                  ? expandedIds.filter((id) => !participantIds.has(id))
                  : [...new Set([...expandedIds, ...participantIds])],
              )
            }
          >
            {t(isEntireListExpanded ? "collapseAllContacts" : "expandAllContacts")}
          </Button>
        )}
      </div>
      {participants.length === 0 ? (
        <EmptyState message={t("noSearchResults")} />
      ) : (
        <>
          <Accordion
            id={accordionId}
            type="multiple"
            value={expandedIds}
            onValueChange={setExpandedIds}
            className="rounded-lg border border-border-strong bg-card nested:border-border"
          >
            {pageItems.map((participant) => (
              <AccordionItem
                key={participant.applicationId}
                value={participant.applicationId}
                className="px-3"
              >
                <AccordionTrigger className="min-h-11 items-center gap-2 py-2">
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 wrap-anywhere">
                    <span className="text-base font-semibold">{participant.name}</span>
                    <span className="text-muted-foreground">{term}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-2 wrap-anywhere text-muted-foreground">
                  <p>{participant.email}</p>
                  {participant.phone ? <p>{participant.phone}</p> : null}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <Pagination
            {...pagination}
            onPageChange={pagination.setPage}
          />
        </>
      )}
    </div>
  )
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()
}
