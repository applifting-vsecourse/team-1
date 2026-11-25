import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { LogoSymbol } from "@/components/atoms/Logo"
import { Card } from "@/components/ui/card"
import { formatTermPrice } from "@/lib/money"
import { cn } from "@/lib/utils"

import { catalogEventPhotoUrl, type CatalogEvent } from "@/features/catalog/api/catalog"
import { eventDatesSummary } from "@/features/catalog/lib/catalog"

// Figma (Design system v2): Karta akce v katalogu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27420-16517 (mobile 27421-16485)
/** One published event; the whole card opens the event page. */
export function EventCard({ event }: { event: CatalogEvent }) {
  const { t } = useTranslation("catalog")
  const dates = eventDatesSummary(event, (count, months) =>
    t("list.termsSummary", { count, months }),
  )
  const hasOneTerm = event.terms.length === 1

  return (
    <Link
      to={ROUTES.event}
      params={{ publicToken: event.publicToken }}
      className="group block h-full rounded-lg outline-none"
    >
      <Card className="h-full gap-0 overflow-hidden p-0 transition-colors group-hover:border-field-border group-focus-visible:border-2 group-focus-visible:border-ring">
        <div className="relative h-46 w-full bg-wash md:h-49">
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
          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pr-2.5 pl-2 text-xs font-medium">
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                event.isOpenForApplications ? "bg-primary" : "bg-muted-foreground",
              )}
            />
            {t(event.isOpenForApplications ? "list.statusOpen" : "list.statusClosed")}
          </span>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <span className="sr-only">{event.organizationName}</span>
          <h3 className="truncate text-lg/6.5 font-semibold tracking-tight">{event.name}</h3>
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            {dates ? <p>{dates}</p> : null}
            {event.location ? <p>{event.location}</p> : null}
          </div>
          {event.fromPriceCzk !== null ? (
            <p className="text-sm text-muted-foreground">
              {hasOneTerm ? null : `${t("price.from")} `}
              <span className="font-semibold text-foreground">
                {formatTermPrice(event.fromPriceCzk)}
              </span>{" "}
              {t("price.perParticipant")}
            </p>
          ) : null}
        </div>
      </Card>
    </Link>
  )
}
