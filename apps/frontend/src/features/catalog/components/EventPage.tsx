import { Link } from "@tanstack/react-router"
import { ArrowLeft, MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { TermPrice } from "@/components/atoms/MoneyAmount"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"

import { catalogEventPhotoUrl, type CatalogEventDetail } from "@/features/catalog/api/catalog"

const linkClass = "w-fit text-link underline underline-offset-4"

// US-123. The one shared page of an event; US-22 adds the free beds and the opening time.
// Figma (Design system): Veřejná stránka akce · Sdílený detail akce · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16146-10195
// Mobil · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16146-10231
export function EventPage({ event }: { event: CatalogEventDetail }) {
  const { t } = useTranslation("catalog")
  const paragraphs = event.description?.split(/\n{2,}/).filter(Boolean) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          to={ROUTES.catalog}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-link transition-colors outline-none hover:bg-accent/70 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft
            aria-hidden
            className="size-4"
          />
          {t("event.back")}
        </Link>
        <h1 className="text-2xl/8 font-bold tracking-tight md:text-3xl/10">{event.name}</h1>
      </div>
      {event.hasPhoto ? (
        <img
          src={catalogEventPhotoUrl(event.publicToken)}
          alt=""
          className="max-h-96 w-full rounded-lg object-cover"
        />
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold tracking-tight">{event.organizationName}</p>
        {event.location ? (
          <p className="flex items-center gap-2 text-muted-foreground">
            <MapPin
              aria-hidden
              className="size-4 shrink-0"
            />
            {event.location}
          </p>
        ) : null}
      </div>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {event.isOpenForApplications ? <p>{t("event.intro")}</p> : null}

      <Card className="gap-4 p-4 md:grid md:grid-cols-[1fr_auto] md:items-center">
        <h2 className="text-2xl/8 font-bold tracking-tight">{t("event.terms")}</h2>
        <ul className="grid grid-cols-1 gap-4 md:col-span-2 md:row-start-2 md:grid-cols-2">
          {event.terms.map((term) => (
            <li
              key={term.id}
              className="flex flex-col gap-2"
            >
              <span className="text-lg font-semibold">
                {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
              </span>
              <TermPrice amountCzk={term.priceCzk} />
            </li>
          ))}
        </ul>
        {event.isOpenForApplications ? (
          <Button
            asChild
            size="lg"
            className="w-full md:col-start-2 md:row-start-1 md:w-auto"
          >
            <Link
              to={ROUTES.applicationForm}
              params={{ token: event.publicToken }}
            >
              {t("event.apply")}
            </Link>
          </Button>
        ) : null}
      </Card>

      <Card className="gap-4 p-4">
        <h2 className="text-2xl/8 font-bold tracking-tight">{t("event.contact")}</h2>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <p className="md:flex-1">{event.organizationName}</p>
          {event.contactEmail ? (
            <p className="md:flex-1">
              <a
                className={linkClass}
                href={`mailto:${event.contactEmail}`}
              >
                {event.contactEmail}
              </a>
            </p>
          ) : null}
          {event.contactPhone ? (
            <p className="md:flex-1">
              <a
                className={linkClass}
                href={`tel:${event.contactPhone.replace(/\s+/g, "")}`}
              >
                {event.contactPhone}
              </a>
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
