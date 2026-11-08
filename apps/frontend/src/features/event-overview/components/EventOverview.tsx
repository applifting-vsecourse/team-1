import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCzk } from "@/lib/money"

import { attentionQueryOptions, type Attention } from "@/features/event-overview/api/attention"
import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"
import { TermList } from "@/features/event-overview/components/CapacityPage"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

type Translate = ReturnType<typeof useTranslation<"eventOverview">>["t"]

/**
 * What needs the organizer's attention in an event (US-51): the event switcher, a card per kind of
 * work that links to the applications list filtered the same way the count was made, and the
 * occupancy of the terms (the list of US-29). "Náhradníci k vyřešení" counts waitlisted applicants
 * the organizer can approve now: manual evaluation and a free bed (PO, 2026-11-07).
 */
// Figma (Design system): #51 Letní kemp Lipno 2027 / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19798-36893
// Figma (Design system): #51 Letní kemp Lipno 2027 / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19798-37048
// Figma (Design system): #51 Přehled · Vše vyřízeno / Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19798-37131
// Figma (Design system): #51 Přehled · Vše vyřízeno / Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19798-37270
export function EventOverview({
  eventId,
  events,
  onEventChange,
  setup,
}: {
  eventId: string
  events: { id: string; name: string }[]
  onEventChange: (eventId: string) => void
  /** Setup steps the event still needs before its link can be shared; shown above the cards (#314). */
  setup?: ReactNode
}) {
  const { t } = useTranslation("eventOverview")

  return (
    <div className="flex flex-col gap-6">
      {events.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="event-switcher">{t("switcher.label")}</Label>
          <Select
            value={eventId}
            onValueChange={onEventChange}
          >
            <SelectTrigger
              id="event-switcher"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem
                  key={event.id}
                  value={event.id}
                >
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {setup}
      <AttentionCards eventId={eventId} />
      <Occupancy eventId={eventId} />
    </div>
  )
}

function AttentionCards({ eventId }: { eventId: string }) {
  const { t } = useTranslation("eventOverview")
  const { data, isPending, error, refetch } = useQuery(attentionQueryOptions(eventId))

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("attention.loadFailed")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }
  const cards = attentionCards(data, t)
  if (cards.every((card) => card.count === 0)) {
    return (
      <Card className="gap-4 p-6">
        <h2 className="text-2xl font-semibold tracking-tight">{t("attention.allClear")}</h2>
        <p>
          {t("attention.allClearEvaluation", {
            toEvaluate: data.toEvaluateCount,
            substitutes: data.substituteCount,
          })}
        </p>
        <p>
          {t("attention.allClearOthers", {
            debt: data.debt.debtorCount,
            requests: data.changeRequestCount,
          })}
        </p>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {cards.map((card) => (
        <AttentionCard
          key={card.key}
          eventId={eventId}
          title={card.title}
          search={card.search}
        >
          {card.body}
        </AttentionCard>
      ))}
    </div>
  )
}

function attentionCards(data: Attention, t: Translate) {
  return [
    {
      key: "toEvaluate",
      count: data.toEvaluateCount,
      title: t("attention.toEvaluate.title", { count: data.toEvaluateCount }),
      body: t("attention.toEvaluate.body"),
      search: { status: "TO_EVALUATE" },
    },
    {
      key: "substitutes",
      count: data.substituteCount,
      title: t("attention.substitutes.title", { count: data.substituteCount }),
      body: t("attention.substitutes.body"),
      // Status too, so the list opens in the waitlist view (tab, order, freed-bed filling; US-104).
      search: { status: "WAITLISTED", waitlist: "FREE_BED" },
    },
    {
      key: "debt",
      count: data.debt.debtorCount,
      title: t("attention.debt.title", { count: data.debt.debtorCount }),
      body: t("attention.debt.body", {
        overdue: data.debt.overdueCount,
        total: formatCzk(data.debt.totalDebtCzk),
      }),
      search: { payment: "DEBT" },
    },
    {
      key: "requests",
      count: data.changeRequestCount,
      title: t("attention.requests.title", { count: data.changeRequestCount }),
      body: t("attention.requests.body"),
      search: { view: "CHANGE_REQUESTS" },
    },
  ] satisfies {
    key: string
    count: number
    title: string
    body: string
    search: ApplicationsSearch
  }[]
}

/** The whole card is the link to the applications list filtered by it. */
function AttentionCard({
  eventId,
  title,
  search,
  children,
}: {
  eventId: string
  title: string
  search: ApplicationsSearch
  children: ReactNode
}) {
  return (
    <Link
      to={ROUTES.organizer.eventApplications}
      params={{ eventId }}
      search={search}
      className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full gap-4 p-6 transition-colors group-hover:border-primary group-hover:bg-muted">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p>{children}</p>
      </Card>
    </Link>
  )
}

function Occupancy({ eventId }: { eventId: string }) {
  const { t } = useTranslation("eventOverview")
  const { data, isPending, error, refetch } = useQuery(occupancyQueryOptions(eventId))

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("capacity.loadFailed")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }
  // An event without rooms has nothing to occupy; the setup block below says what is missing.
  if (data.terms.every((term) => term.roomCount === 0)) return null
  return (
    <TermList
      eventId={eventId}
      terms={data.terms}
    />
  )
}
