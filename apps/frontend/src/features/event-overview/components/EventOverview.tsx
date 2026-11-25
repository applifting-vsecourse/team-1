import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  CreditCard,
  RefreshCw,
  type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CardGrid } from "@/components/molecules/CardGrid"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCzk } from "@/lib/money"
import { termLine } from "@/lib/term-label"

import { attentionQueryOptions, type Attention } from "@/features/event-overview/api/attention"
import { occupancyQueryOptions } from "@/features/event-overview/api/occupancy"
import { FreedBedBanner } from "@/features/event-overview/components/FreedBedBanner"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"

type Translate = ReturnType<typeof useTranslation<"eventOverview">>["t"]

/**
 * What needs the organizer's attention in an event (US-51): the event switcher, a card per kind of
 * work that links to the applications list filtered the same way the count was made, and the
 * occupancy of the terms (the list of US-29). "Náhradníci k vyřešení" counts waitlisted applicants
 * the organizer can approve now: a free bed for them, in both evaluation modes (PO, 2026-11-07; US-31).
 */
// Figma v2: US-51 Co vyžaduje pozornost · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20580-44169 (mobile 20580-44426).
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
    <div className="flex flex-col gap-4">
      {events.length > 0 ? (
        <div className="flex flex-col gap-2 sm:max-w-96">
          <Label htmlFor="event-switcher">{t("switcher.label")}</Label>
          <Select
            value={eventId}
            onValueChange={onEventChange}
          >
            <SelectTrigger
              id="event-switcher"
              className="w-full md:max-w-120"
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
      <FreedBedBanner eventId={eventId} />
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
  const isClear = cards.every((card) => card.count === 0)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-semibold">{t("attention.heading")}</h2>
      {isClear && (
        <Alert
          role="status"
          className="border-border bg-status-success-bg"
        >
          <CheckCircle2
            aria-hidden
            className="text-status-success"
          />
          <AlertTitle>{t("attention.clear.title")}</AlertTitle>
          <AlertDescription>{t("attention.clear.body")}</AlertDescription>
        </Alert>
      )}
      <CardGrid className={isClear ? "items-stretch opacity-72" : "items-stretch"}>
        {cards.map((card) => (
          <AttentionCard
            key={card.key}
            eventId={eventId}
            icon={card.icon}
            title={card.title}
            search={card.search}
          >
            {card.body}
          </AttentionCard>
        ))}
      </CardGrid>
    </section>
  )
}

function attentionCards(data: Attention, t: Translate) {
  return [
    {
      key: "toEvaluate",
      icon: ClipboardList,
      count: data.toEvaluateCount,
      title: t("attention.toEvaluate.title", { count: data.toEvaluateCount }),
      body: t("attention.toEvaluate.body"),
      search: { status: "TO_EVALUATE" },
    },
    {
      key: "substitutes",
      icon: Clock,
      count: data.substituteCount,
      title: t("attention.substitutes.title", { count: data.substituteCount }),
      body: t("attention.substitutes.body"),
      // The waitlist view (tab, order, freed-bed filling; US-104) with the free-bed filter, so the
      // list has as many rows as the card counts.
      search: { status: "WAITLISTED", waitlist: "FREE_BED" },
    },
    {
      key: "debt",
      icon: CreditCard,
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
      icon: RefreshCw,
      count: data.changeRequestCount,
      title: t("attention.requests.title", { count: data.changeRequestCount }),
      body: t("attention.requests.body"),
      search: { view: "CHANGE_REQUESTS" },
    },
  ] satisfies {
    icon: LucideIcon
    key: string
    count: number
    title: string
    body: string
    search: ApplicationsSearch
  }[]
}

/** The whole card is the link to the applications list filtered by it. */
function AttentionCard({
  icon: Icon,
  eventId,
  title,
  search,
  children,
}: {
  eventId: string
  icon: LucideIcon
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
      <Card className="gap-2 rounded-lg p-3 shadow-none transition-colors group-hover:border-primary group-hover:bg-muted md:p-4">
        <div className="flex items-center gap-2">
          <Icon
            aria-hidden
            className="size-6 shrink-0 text-primary dark:text-link"
          />
          <h3 className="min-w-0 flex-1 font-bold break-words">{title}</h3>
          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-muted-foreground"
          />
        </div>
        <p className="text-sm text-muted-foreground">{children}</p>
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
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-semibold">{t("overview.occupancy")}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.terms.map((term) => (
          <Card
            key={term.id}
            className="gap-3 rounded-lg p-3 shadow-none md:p-4"
          >
            <h3 className="text-lg font-semibold tracking-tight">{termLine(term)}</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{t("overview.occupied")}</span>
                <span className="font-semibold tabular-nums">
                  {term.confirmed}/{term.capacity}
                </span>
              </div>
              <Progress
                value={term.capacity ? Math.min(100, (term.confirmed / term.capacity) * 100) : 0}
                aria-label={t("overview.occupied")}
              />
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-muted-foreground">{t("overview.freeBeds")}</dt>
                <dd className="font-semibold tabular-nums">{term.free}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">{t("capacity.waitlistedColumn")}</dt>
                <dd className="font-semibold tabular-nums">{term.waitlisted}</dd>
              </div>
            </dl>
            <div className="grid gap-1 sm:grid-cols-2">
              <Button
                asChild
                variant="outline"
              >
                <Link
                  to={ROUTES.organizer.eventApplications}
                  params={{ eventId }}
                  search={{ term: term.id }}
                >
                  {t("overview.viewApplications")}
                </Link>
              </Button>
              {term.waitlisted > 0 ? (
                <Button
                  asChild
                  variant="outline"
                >
                  <Link
                    to={ROUTES.organizer.eventApplications}
                    params={{ eventId }}
                    search={{ term: term.id, status: "WAITLISTED" }}
                  >
                    {t("overview.viewWaitlist")}
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled
                >
                  {t("overview.viewWaitlist")}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
