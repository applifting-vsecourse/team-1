import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { COMPACT_LIMITS, compactList, SINGLE_COLUMN_TERMS } from "@/lib/compact-list"
import { formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termName } from "@/lib/term-label"

import { catalogEventPhotoUrl, type CatalogEvent } from "@/features/catalog/api/catalog"

// Figma v2 #732 card with 12 / 100 terms: https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27413-17146 (mobile 27413-17309)
// Figma v2: public catalog event cards · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22640-12072 (mobile 22640-12173)
/** One published event; the whole card opens the event page. */
export function EventCard({ event }: { event: CatalogEvent }) {
  const { t } = useTranslation("catalog")
  // Up to three terms the dates sit one under another; more are laid out in two columns, first
  // four only, and the rest is counted (#732).
  const isCompact = event.terms.length > SINGLE_COLUMN_TERMS
  const { visible: visibleTerms, hiddenCount } = compactList(
    event.terms,
    COMPACT_LIMITS.catalogCard,
  )

  return (
    <Link
      to={ROUTES.event}
      params={{ publicToken: event.publicToken }}
      className="group block lift rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
    >
      <Card className="h-full min-h-[214px] gap-0 overflow-hidden p-0">
        {event.hasPhoto ? (
          <img
            src={catalogEventPhotoUrl(event.publicToken)}
            alt=""
            loading="lazy"
            className="h-44 w-full border-b border-border-strong object-cover"
          />
        ) : null}
        <div className="flex flex-1 flex-col gap-3 p-5">
          <span className="sr-only">{event.organizationName}</span>
          <h3 className="text-2xl/8 font-bold">{event.name}</h3>
          {event.terms.length > 0 ? (
            <div className="flex flex-col gap-1">
              <ul className={isCompact ? "grid grid-cols-2 gap-x-3 gap-y-1" : undefined}>
                {(isCompact ? visibleTerms : event.terms).map((term) => (
                  <li
                    key={term.startsOn}
                    className="flex min-w-0 flex-col"
                  >
                    {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
                    {!isCompact && termName(term) ? (
                      <span className="text-sm text-muted-foreground">{termName(term)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {isCompact && hiddenCount > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("list.moreTerms", { count: hiddenCount })}
                </p>
              ) : null}
            </div>
          ) : null}
          {event.location ? (
            <p className="text-sm text-muted-foreground">{event.location}</p>
          ) : null}
          <Badge
            className={
              event.isOpenForApplications ? "bg-primary text-primary-foreground" : undefined
            }
          >
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
        </div>
      </Card>
    </Link>
  )
}
