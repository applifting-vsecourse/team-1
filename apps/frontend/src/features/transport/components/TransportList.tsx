import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Pencil, Trash2, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

// Transport of an event, term by term: the ways to get there with their participants. Same flow as
// the rooms: pick a term, a table (a list on a phone), add / edit in a dialog, delete after a warning.
// Design proposal (US-402), based on Figma (Design system): #65 Doprava · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12467
// Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-12627
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
      <SectionHeader
        title={t("title")}
        description={t("description")}
      />
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
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <CardTitle>
            <h3>{t("listTitle")}</h3>
          </CardTitle>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              size="lg"
              className="max-sm:w-full"
              onClick={() => {
                setEditor({ kind: "SCHEDULED" })
              }}
            >
              {t("add")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {term.transports.length ? (
            <ul className="grid gap-4 md:grid-cols-2">
              {term.transports.map((item) => (
                <li
                  key={item.id}
                  className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="min-w-0 text-lg font-semibold break-words">{nameOf(item)}</h4>
                    {actions(item)}
                  </div>
                  {item.kind === "OWN" && <Badge variant="secondary">{t("ownBadge")}</Badge>}
                  <dl className="grid gap-2">
                    {item.departureAt && (
                      <div>
                        <dt className="text-sm text-muted-foreground">{t("departureColumn")}</dt>
                        <dd>{whenOf(item)}</dd>
                      </div>
                    )}
                    {item.departurePlace && (
                      <div>
                        <dt className="text-sm text-muted-foreground">{t("placeColumn")}</dt>
                        <dd className="break-words">{item.departurePlace}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm text-muted-foreground">{t("participantsColumn")}</dt>
                      <dd className="font-semibold tabular-nums">{item.participantsCount}</dd>
                    </div>
                  </dl>{" "}
                  <Button
                    asChild
                    variant="outline"
                    className="mt-auto self-start"
                  >
                    <Link
                      to={ROUTES.organizer.eventTransportParticipants}
                      params={{ eventId, transportId: item.id }}
                      aria-label={t("showParticipantsOf", { name: nameOf(item) })}
                    >
                      <Users aria-hidden />
                      {t("participantsColumn")}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message={t("empty")} />
          )}
        </CardContent>
      </Card>
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
