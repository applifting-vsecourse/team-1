import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { termDatesLine } from "@/lib/term-label"

import {
  eventTransportQueryOptions,
  type TransportKind,
  type TransportSummary,
} from "@/features/transport/api/transport"
import { DeleteTransportDialog } from "@/features/transport/components/DeleteTransportDialog"
import { TransportDialog } from "@/features/transport/components/TransportDialog"
import { departureText } from "@/features/transport/lib/departure"

type Editor = { kind: TransportKind; transport?: TransportSummary }

// Transport of an event, term by term: the ways to get there with their participants. Pick a term,
// a card per way, add / edit in a dialog, delete after a warning.
// Figma v2: US-65 Přehled dopravy · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=21206-63432 (360 px: node-id=21206-63636)
export function TransportList({ eventId }: { eventId: string }) {
  const { t } = useTranslation("transport")
  const query = useQuery(eventTransportQueryOptions(eventId))
  const [termId, setTermId] = useState<string | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleting, setDeleting] = useState<TransportSummary | null>(null)

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
  const { terms } = query.data
  const term = terms.find((item) => item.termId === termId) ?? terms[0]
  if (!term) {
    return (
      <div className="flex flex-col gap-6">
        <Seo title={t("title")} />
        <SectionHeader title={t("title")} />
        <EmptyState message={t("noTerms")} />
      </div>
    )
  }
  const hasOwn = term.transports.some((item) => item.kind === "OWN")
  const nameOf = (item: TransportSummary) => (item.kind === "OWN" ? t("own") : item.name)
  const whenOf = (item: TransportSummary) =>
    item.departureAt ? departureText(item.departureAt, t("at")) : null
  const copyable = terms
    .filter((item) => item.termId !== term.termId)
    .flatMap((item) => item.transports.filter((transport) => transport.kind === "SCHEDULED"))

  const actions = (item: TransportSummary) => (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={t("editOf", { name: nameOf(item) })}
        onClick={() => {
          setEditor({ kind: item.kind, transport: item })
        }}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={t("deleteOf", { name: nameOf(item) })}
        onClick={() => {
          setDeleting(item)
        }}
      >
        <Trash2 />
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("title")} />
      <SectionHeader title={t("title")} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Label htmlFor="transport-term">{t("termLabel")}</Label>
        <Select
          value={term.termId}
          onValueChange={setTermId}
        >
          <SelectTrigger
            id="transport-term"
            className="w-full bg-card sm:w-60"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {terms.map((item) => (
              <SelectItem
                key={item.termId}
                value={item.termId}
              >
                {termDatesLine({ ...item, name: item.termName })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <section
        aria-label={t("listTitle")}
        className="flex flex-col gap-6"
      >
        {term.transports.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {term.transports.map((item) => (
              <li key={item.id}>
                <Card className="h-full min-w-0 gap-4 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 text-xl font-bold tracking-tight break-words">
                      {nameOf(item)}
                    </h3>
                    {actions(item)}
                  </div>
                  {item.departureAt || item.departurePlace ? (
                    <dl className="grid gap-3">
                      {item.departureAt && (
                        <div className="flex flex-col gap-1">
                          <dt className="text-sm text-muted-foreground">{t("departureColumn")}</dt>
                          <dd>{whenOf(item)}</dd>
                        </div>
                      )}
                      {item.departurePlace && (
                        <div className="flex flex-col gap-1">
                          <dt className="text-sm text-muted-foreground">{t("placeColumn")}</dt>
                          <dd className="break-words">{item.departurePlace}</dd>
                        </div>
                      )}
                    </dl>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <p className="tabular-nums">
                      {t("chosenBy", { count: item.participantsCount })}
                    </p>
                    <Button
                      asChild
                      variant="ghost"
                    >
                      <Link
                        to={ROUTES.organizer.eventTransportParticipants}
                        params={{ eventId, transportId: item.id }}
                        aria-label={t("showParticipantsOf", { name: nameOf(item) })}
                      >
                        {t("showParticipants")}
                      </Link>
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message={t("empty")} />
        )}
        <Button
          size="lg"
          className="self-start max-sm:w-full"
          onClick={() => {
            setEditor({ kind: "SCHEDULED" })
          }}
        >
          <Plus aria-hidden />
          {t("add")}
        </Button>
      </section>
      {editor ? (
        <TransportDialog
          key={editor.transport?.id ?? `new-${editor.kind}`}
          eventId={eventId}
          term={term}
          kind={editor.kind}
          transport={editor.transport}
          canAddOwn={!hasOwn}
          copyable={copyable}
          onClose={() => {
            setEditor(null)
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteTransportDialog
          eventId={eventId}
          transport={deleting}
          onClose={() => {
            setDeleting(null)
          }}
        />
      ) : null}
    </div>
  )
}
