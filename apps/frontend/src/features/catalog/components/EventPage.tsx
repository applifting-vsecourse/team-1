import { Link } from "@tanstack/react-router"
import { Building2, CalendarDays, Mail, MapPin, Phone } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { TermPrice } from "@/components/atoms/MoneyAmount"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"

import { catalogEventPhotoUrl, type CatalogEventDetail } from "@/features/catalog/api/catalog"

const linkClass = "w-fit text-link underline underline-offset-4"
const sectionClass = "flex flex-col gap-4 border-t border-border pt-8"
const panelClass = "overflow-hidden rounded-lg border border-border bg-secondary"
const sectionTitleClass = "text-xl font-semibold tracking-tight md:text-2xl"

// US-22. The one shared page of an event at its permanent address; the catalog (US-123) links to it.
// Figma (Design system): #22 Letní kemp Lipno 2027 · Desktop · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23920
// Mobil · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19795-23995
// Built on the order of the frames, with the photo, icons, term rows and the apply button at the end added
// on request (see the PR, "Odchylky od Figmy"). No capacity, occupancy or free beds on the page (D-094).
export function EventPage({ event }: { event: CatalogEventDetail }) {
  const { t } = useTranslation("catalog")
  const paragraphs = event.description?.split(/\n{2,}/).filter(Boolean) ?? []
  const first = event.terms[0]
  const last = event.terms[event.terms.length - 1]
  const hasContact = event.contactEmail !== null || event.contactPhone !== null

  return (
    <Card className="gap-8 p-5 md:p-10">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-link">
            <Building2
              aria-hidden
              className="size-4 shrink-0"
            />
            {event.organizationName}
          </p>
          <h1 className="text-3xl/10 font-bold tracking-tight md:text-4xl/11">{event.name}</h1>
        </div>
        <ul className="flex flex-col gap-2 text-muted-foreground md:flex-row md:flex-wrap md:gap-x-6">
          {event.location ? (
            <li className="flex items-center gap-2">
              <MapPin
                aria-hidden
                className="size-4 shrink-0"
              />
              {event.location}
            </li>
          ) : null}
          {first && last ? (
            <li className="flex items-center gap-2">
              <CalendarDays
                aria-hidden
                className="size-4 shrink-0"
              />
              {formatDateRange(first.startsOn, last.endsOn, { shouldShowYear: true })}
            </li>
          ) : null}
        </ul>
        {event.hasPhoto ? (
          <img
            src={catalogEventPhotoUrl(event.publicToken)}
            alt=""
            className="h-40 w-full rounded-lg border border-border object-cover md:h-72"
          />
        ) : null}
      </header>

      {paragraphs.length > 0 ? (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t("event.about")}</h2>
          <div className="flex flex-col gap-4">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>{t("event.terms")}</h2>
        <div className={panelClass}>
          <ul>
            {event.terms.map((term) => (
              <li
                key={term.id}
                className="flex items-center justify-between gap-4 border-t border-border px-5 py-4 first:border-t-0"
              >
                <TermLabel term={term} />
                <span className="text-right">
                  <TermPrice
                    className="text-lg font-bold"
                    amountCzk={term.priceCzk}
                  />{" "}
                  <span className="block text-sm text-muted-foreground md:inline">
                    {t("event.perPerson")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {hasContact ? (
        <section className={sectionClass}>
          <h2 className={sectionTitleClass}>{t("event.contact")}</h2>
          <div className={`${panelClass} flex flex-col gap-4 p-5`}>
            <p className="flex items-center gap-3 text-xl font-bold tracking-tight">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-link">
                <Building2
                  aria-hidden
                  className="size-5"
                />
              </span>
              {event.organizationName}
            </p>
            {event.contactEmail ? (
              <p className="flex items-center gap-3">
                <Mail
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <a
                  className={linkClass}
                  href={`mailto:${event.contactEmail}`}
                >
                  {event.contactEmail}
                </a>
              </p>
            ) : null}
            {event.contactPhone ? (
              <p className="flex items-center gap-3">
                <Phone
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <a
                  className={linkClass}
                  href={`tel:${event.contactPhone.replace(/\s+/g, "")}`}
                >
                  {event.contactPhone}
                </a>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="flex justify-center border-t border-border pt-8">
        <Button
          asChild
          size="lg"
          className="w-full text-base md:w-auto md:min-w-80"
        >
          <Link
            to={ROUTES.applicationForm}
            params={{ token: event.publicToken }}
          >
            {t("event.apply")}
          </Link>
        </Button>
      </div>
    </Card>
  )
}
