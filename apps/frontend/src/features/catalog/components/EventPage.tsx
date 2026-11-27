import { useState } from "react"
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
import { COMPACT_LIMITS, compactList, SINGLE_COLUMN_TERMS } from "@/lib/compact-list"
import { cn } from "@/lib/utils"

import { catalogEventPhotoUrl, type CatalogEventDetail } from "@/features/catalog/api/catalog"

// Figma v2 #732 event with 12 / 100 terms: https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27413-17449 (mobile 27413-17719; 100 terms 27413-17584 / 27413-17826)
// Figma v2: US-22 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20188-6594 (mobile 20188-6692).
export function EventPage({ event }: { event: CatalogEventDetail }) {
  const { t } = useTranslation("catalog")
  const paragraphs = event.description?.split(/\n{2,}/).filter(Boolean) ?? []
  const hasContact = Boolean(event.contactEmail) || Boolean(event.contactPhone)
  // Up to three terms the card stays in the right column; more terms get the full width (#732).
  const isWide = event.terms.length > SINGLE_COLUMN_TERMS
  const [isExpanded, setIsExpanded] = useState(false)
  const { visible, hiddenCount } = compactList(event.terms, COMPACT_LIMITS.eventPage)
  const shownTerms = isWide && !isExpanded ? visible : event.terms

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
        <div
          className={cn("flex min-w-0 flex-col gap-6", isWide && "md:col-start-1 md:row-start-1")}
        >
          {event.hasPhoto ? (
            <img
              src={catalogEventPhotoUrl(event.publicToken)}
              alt=""
              className="h-50 w-full rounded-2xl border border-border-strong object-cover md:h-70"
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
        <div className={cn("flex min-w-0 flex-col gap-6", isWide && "contents")}>
          <Card className={cn("gap-4 p-4", isWide && "relative md:col-span-2 md:row-start-2")}>
            <h2 className="text-xl font-semibold md:text-2xl">{t("event.terms")}</h2>
            <ul
              className={isWide ? "grid grid-cols-2 gap-4 md:grid-cols-3" : "flex flex-col gap-5"}
            >
              {shownTerms.map((term) => (
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
            {isWide && hiddenCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full md:w-fit"
                aria-expanded={isExpanded}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded
                  ? t("event.showFewerTerms")
                  : t("event.showMoreTerms", { count: hiddenCount })}
              </Button>
            ) : null}
            <p className="text-sm">{t("event.priceNote")}</p>
            <Button
              asChild
              className={cn("w-full", isWide && "md:absolute md:top-4 md:right-4 md:w-auto")}
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
            <Card
              className={cn(
                "gap-3 rounded-xl p-4 shadow-none",
                isWide && "md:col-start-2 md:row-start-1",
              )}
            >
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
