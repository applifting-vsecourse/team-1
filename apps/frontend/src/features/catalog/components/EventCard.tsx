import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { DateTile } from "@/components/atoms/DateTile"
import { LogoSymbol } from "@/components/atoms/Logo"
import { PriceTag } from "@/components/atoms/PriceTag"
import { Card } from "@/components/ui/card"
import { formatTermPrice } from "@/lib/money"
import { cn } from "@/lib/utils"

import { catalogEventPhotoUrl, type CatalogEvent } from "@/features/catalog/api/catalog"
import { eventDatesSummary } from "@/features/catalog/lib/catalog"

// Figma (Design system v2): Karta akce v katalogu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27420-16517 (mobile 27421-16485)
// System B (2026-11-27): HF/01 catalog 22640-12072 (mobile 22640-12173), price tag 27719-4276, date tile 27719-4271.
/**
 * One published event; the whole card opens the event page. The photo corner carries the start of
 * the first term as a date tile, the price is an orange price tag; the open status is a tonal pill.
 */
export function EventCard({ event }: { event: CatalogEvent }) {
  const { t } = useTranslation("catalog")
  const dates = eventDatesSummary(event, (count, months) =>
    t("list.termsSummary", { count, months }),
  )
  const hasOneTerm = event.terms.length === 1
  const firstTerm = event.terms[0]

  return (
    <Link
      to={ROUTES.event}
      params={{ publicToken: event.publicToken }}
      className="group block h-full lift rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
    >
      <Card className="h-full gap-0 overflow-hidden p-0">
        <div className="relative h-46 w-full border-b border-border-strong bg-wash md:h-49">
          {event.hasPhoto ? (
            <img
              src={catalogEventPhotoUrl(event.publicToken)}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <LogoSymbol className="size-10 text-primary" />
            </div>
          )}
          <span
            data-open={event.isOpenForApplications}
            className={cn(
              "absolute top-3 left-3 flex items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-2 text-xs font-medium",
              event.isOpenForApplications
                ? "border-transparent bg-status-success-bg"
                : "border-border bg-card",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                event.isOpenForApplications ? "bg-status-success" : "bg-muted-foreground",
              )}
            />
            {t(event.isOpenForApplications ? "list.statusOpen" : "list.statusClosed")}
          </span>
          {firstTerm ? (
            <DateTile
              date={firstTerm.startsOn}
              className="absolute top-3 right-3"
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-2 p-4">
          <span className="sr-only">{event.organizationName}</span>
          <h3 className="truncate text-lg/6.5 font-semibold tracking-tight">{event.name}</h3>
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            {dates ? <p>{dates}</p> : null}
            {event.location ? <p>{event.location}</p> : null}
          </div>
          {event.fromPriceCzk !== null ? (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <PriceTag>
                {hasOneTerm ? null : `${t("price.from")} `}
                {formatTermPrice(event.fromPriceCzk)}
              </PriceTag>{" "}
              {t("price.perParticipant")}
            </p>
          ) : null}
        </div>
      </Card>
    </Link>
  )
}
