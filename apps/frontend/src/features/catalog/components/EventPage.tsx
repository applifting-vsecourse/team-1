import { Link } from "@tanstack/react-router"
import { MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BrandDivider } from "@/components/atoms/BrandDivider"
import { CopyButton } from "@/components/atoms/CopyButton"
import { TermPrice } from "@/components/atoms/MoneyAmount"
import { BackLink } from "@/components/molecules/BackLink"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { catalogEventPhotoUrl, type CatalogEventDetail } from "@/features/catalog/api/catalog"

// Figma v2: US-22 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20188-6594 (mobile 20188-6692).
export function EventPage({ event }: { event: CatalogEventDetail }) {
  const { t } = useTranslation("catalog")
  const paragraphs = event.description?.split(/\n{2,}/).filter(Boolean) ?? []
  const hasContact = Boolean(event.contactEmail) || Boolean(event.contactPhone)

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col items-start gap-2">
        <div className="flex items-start gap-3 md:gap-4">
          <BackLink to={ROUTES.catalog}>{t("event.back")}</BackLink>
          <h1 className="min-w-0 self-center text-2xl font-bold tracking-tight wrap-anywhere md:text-[32px]/10">
            {event.name}
          </h1>
        </div>
        <div className="mt-4 w-full md:mt-6">
          <BrandDivider className="md:[&>span]:w-20" />
        </div>
        <CopyButton
          value={new URL(window.location.pathname, window.location.origin).href}
          label={t("event.copyLink")}
          showLabel
        />
      </header>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          {event.hasPhoto ? (
            <img
              src={catalogEventPhotoUrl(event.publicToken)}
              alt=""
              className="h-50 w-full rounded-2xl border border-border object-cover md:h-70"
            />
          ) : null}
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">{event.organizationName}</h2>
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
            <p
              key={paragraph}
              className="whitespace-pre-line"
            >
              {paragraph}
            </p>
          ))}
          <p>
            {t(event.terms.length === 2 ? "event.applicationHintTwo" : "event.applicationHint")}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="gap-4 rounded-xl border-0 p-4 shadow-none">
            <h2 className="text-xl font-semibold md:text-2xl">{t("event.terms")}</h2>
            <ul className="flex flex-col gap-5">
              {event.terms.map((term) => (
                <li
                  key={term.id}
                  className="flex flex-col items-start gap-1"
                >
                  <TermLabel
                    term={term}
                    isProminent
                  />
                  <TermPrice
                    className="min-h-6.5 text-base/5.5 font-bold tabular-nums"
                    amountCzk={term.priceCzk}
                  />
                </li>
              ))}
            </ul>
            <p className="text-sm">{t("event.priceNote")}</p>
            <Button
              asChild
              className="w-full"
            >
              <Link
                to={ROUTES.applicationForm}
                params={{ token: event.publicToken }}
              >
                {t("event.apply")}
              </Link>
            </Button>
          </Card>
          {hasContact ? (
            <Card className="gap-3 rounded-xl p-4 shadow-none">
              <h2 className="text-xl font-semibold md:text-2xl">{t("event.contact")}</h2>
              <p className="text-lg font-semibold">{event.organizationName}</p>
              {event.contactEmail ? (
                <div className="flex flex-col items-start gap-2 rounded-lg bg-secondary p-3">
                  <span className="text-sm text-muted-foreground">{t("event.write")}</span>
                  <a
                    className="break-all text-link underline underline-offset-4"
                    href={`mailto:${event.contactEmail}`}
                  >
                    {event.contactEmail}
                  </a>
                </div>
              ) : null}
              {event.contactPhone ? (
                <div className="flex flex-col items-start gap-2 rounded-lg bg-secondary p-3">
                  <span className="text-sm text-muted-foreground">{t("event.call")}</span>
                  <a
                    className="text-link underline underline-offset-4"
                    href={`tel:${event.contactPhone.replace(/\s+/g, "")}`}
                  >
                    {event.contactPhone}
                  </a>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>
      </div>
    </article>
  )
}
