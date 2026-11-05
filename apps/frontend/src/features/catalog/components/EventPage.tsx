import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { TermPrice } from "@/components/atoms/MoneyAmount"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { termDates, termName, termTitle } from "@/lib/term-label"

import { catalogEventPhotoUrl, type CatalogEventDetail } from "@/features/catalog/api/catalog"

const cardTitleClass = "text-2xl/8 font-bold tracking-tight"

// US-22. The one shared page of an event at its permanent address; the catalog (US-123) links to it.
// Figma (Design system): #22 Letní kemp Lipno 2027 · Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23920
// Mobil · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23995
// No capacity, occupancy or free beds on the page (D-094).
export function EventPage({ event }: { event: CatalogEventDetail }) {
  const { t } = useTranslation("catalog")
  const paragraphs = event.description?.split(/\n{2,}/).filter(Boolean) ?? []
  const hasContact = (event.contactEmail ?? event.contactPhone) !== null

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl/8 font-bold tracking-tight">{event.name}</h1>
      <p>{[event.organizationName, event.location].filter(Boolean).join(" · ")}</p>
      {event.hasPhoto ? (
        <img
          src={catalogEventPhotoUrl(event.publicToken)}
          alt=""
          className="max-h-96 w-full rounded-lg object-cover"
        />
      ) : null}
      {paragraphs.length > 0 ? (
        <Card className="gap-4 p-4">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </Card>
      ) : null}

      {event.terms.map((term) => (
        <Card
          key={term.id}
          className="gap-4 p-4"
        >
          <h2 className={cardTitleClass}>{termTitle(term)}</h2>
          {termName(term) ? <p>{termDates(term)}</p> : null}
          <p>
            <TermPrice amountCzk={term.priceCzk} /> {t("event.perPerson")}
          </p>
        </Card>
      ))}

      <Button
        asChild
        size="lg"
        className="w-full"
      >
        <Link
          to={ROUTES.applicationForm}
          params={{ token: event.publicToken }}
        >
          {t("event.apply")}
        </Link>
      </Button>

      {hasContact ? (
        <Card className="gap-4 p-4">
          <h2 className={cardTitleClass}>{t("event.contact")}</h2>
          {event.contactEmail ? (
            <p>
              {event.organizationName} · {event.contactEmail}
            </p>
          ) : null}
          {event.contactPhone ? <p>{event.contactPhone}</p> : null}
        </Card>
      ) : null}
    </div>
  )
}
