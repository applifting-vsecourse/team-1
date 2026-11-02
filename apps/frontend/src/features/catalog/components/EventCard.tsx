import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termName } from "@/lib/term-label"

import type { CatalogEvent } from "@/features/catalog/api/catalog"

// Figma (Design system): Togena / Event card v katalogu
// desktop · Katalog organizací · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16146-10083
// mobil · Katalog organizací · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16146-10109
/** One published event; the whole card opens the event page. */
export function EventCard({ event }: { event: CatalogEvent }) {
  const { t } = useTranslation("catalog")

  return (
    <Link
      to={ROUTES.catalogEvent}
      params={{ publicToken: event.publicToken }}
      className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full gap-3 p-5 transition-colors group-hover:border-primary">
        <p className="text-sm text-muted-foreground">{event.organizationName}</p>
        <h2 className="text-2xl/8 font-bold tracking-tight">{event.name}</h2>
        {event.terms.length > 0 ? (
          <ul>
            {event.terms.map((term) => (
              <li
                key={term.startsOn}
                className="flex flex-col"
              >
                {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
                {termName(term) ? (
                  <span className="text-sm text-muted-foreground">{termName(term)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {event.location ? <p className="text-sm text-muted-foreground">{event.location}</p> : null}
        <Badge>
          {event.isOpenForApplications ? t("list.badgeOpen") : t("list.badgePublished")}
        </Badge>
        {event.termCount > 0 && event.fromPriceCzk !== null ? (
          <p className="text-sm text-muted-foreground">
            {t(event.termCount > 1 ? "list.summaryFrom" : "list.summary", {
              count: event.termCount,
              price: formatCzk(event.fromPriceCzk),
            })}
          </p>
        ) : null}
      </Card>
    </Link>
  )
}
