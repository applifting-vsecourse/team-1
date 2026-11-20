import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
      <BackLink
        to={ROUTES.organizer.eventTransport}
        params={{ eventId }}
      >
        {t("back")}
      </BackLink>
      <SectionHeader
        title={title}
        description={termLine(termValue)}
      />
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
          <p aria-live="polite">
            {t("termParticipants", { term: termTitle(termValue), count: shown.length })}
          </p>
          {shown.length === 0 ? (
            <EmptyState message={t("noSearchResults")} />
          ) : (
            <ParticipantTable
              participants={shown}
              term={termLine(termValue)}
              resetKey={search}
            />
          )}
        </>
      )}
    </div>
  )
}

function ParticipantTable({
  participants,
  term,
  resetKey,
}: {
  participants: TransportParticipant[]
  term: string
  resetKey: string
}) {
  const { t } = useTranslation("transport")
  const { pageItems, ...pagination } = usePagination(participants, resetKey)
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="px-4">{t("participantTermColumn")}</TableHead>
              <TableHead className="px-4">{t("contactColumn")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((participant) => (
              <TableRow key={participant.applicationId}>
                <TableCell className="px-4 py-3 whitespace-normal">
                  <span className="block">{participant.name}</span>
                  <span className="block text-sm text-muted-foreground">{term}</span>
                </TableCell>
                <TableCell className="px-4 py-3 text-sm break-all whitespace-normal text-muted-foreground">
                  <span className="block">{participant.email}</span>
                  {participant.phone ? <span className="block">{participant.phone}</span> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        {...pagination}
        onPageChange={pagination.setPage}
      />
    </div>
  )
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()
}
