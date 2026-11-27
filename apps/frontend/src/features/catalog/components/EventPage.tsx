import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronDown, MapPin } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CopyButton } from "@/components/atoms/CopyButton"
import { BackLink } from "@/components/molecules/BackLink"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { COMPACT_LIMITS, compactList } from "@/lib/compact-list"
import { formatTermPrice } from "@/lib/money"
import { termDates, termName } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import { catalogEventPhotoUrl, type CatalogEventDetail } from "@/features/catalog/api/catalog"
import { lowestPrice } from "@/features/catalog/lib/catalog"

/** Up to this many terms the card sticks beside the description, as drawn. */
const STICKY_TERMS = 3

// Figma (Design system v2): Stránka akce · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20188-6594 (mobile 20188-6692)
// Header 27424-16425, contact 27424-16432 (expanded 27426-16389 / 27426-16419), application card 20188-6620 / 20188-6713, mobile bar 27425-16448.
// Many terms (#732): first eight and „Zobrazit další…“ as in 27413-17449 / 27413-17584 (mobile 27413-17719 / 27413-17826), kept in this card.
export function EventPage({ event }: { event: CatalogEventDetail }) {
  const { t } = useTranslation("catalog")
  const [isContactOpen, setIsContactOpen] = useState(false)
  const paragraphs = event.description?.split(/\n{2,}/).filter(Boolean) ?? []
  const hasContact = Boolean(event.contactEmail) || Boolean(event.contactPhone)
  const price = lowestPrice(event.terms)
  const [isTermsExpanded, setIsTermsExpanded] = useState(false)
  const { visible: foldedTerms, hiddenCount } = compactList(event.terms, COMPACT_LIMITS.eventPage)
  const shownTerms = isTermsExpanded ? event.terms : foldedTerms
  // A long card would stick with its end, and the button, below the fold; only a short one sticks.
  const isSticky = event.terms.length <= STICKY_TERMS
  const apply = (
    <Link
      to={ROUTES.applicationForm}
      params={{ token: event.publicToken }}
    >
      {t("event.apply")}
    </Link>
  )

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <BackLink to={ROUTES.catalog}>{t("event.back")}</BackLink>
          <CopyButton
            value={new URL(window.location.pathname, window.location.origin).href}
            label={t("event.copyLink")}
            showLabel
            labelClassName="max-md:sr-only"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight wrap-anywhere md:text-[32px]/10">
          {event.name}
        </h1>
        <Collapsible
          open={isContactOpen}
          onOpenChange={setIsContactOpen}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col items-start gap-1 md:flex-row md:flex-wrap md:items-center md:gap-x-4">
            <p className="text-muted-foreground">
              {t("event.organizedBy")}{" "}
              <span className="font-medium text-foreground">{event.organizationName}</span>
            </p>
            {event.location ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin
                  aria-hidden
                  className="size-4 shrink-0"
                />
                {event.location}
              </p>
            ) : null}
            {hasContact ? (
              <CollapsibleTrigger className="flex min-h-11 items-center gap-1 text-link underline underline-offset-4 md:min-h-0">
                {t(isContactOpen ? "event.contactHide" : "event.contactShow")}
                <ChevronDown
                  aria-hidden
                  className={isContactOpen ? "size-4 rotate-180" : "size-4"}
                />
              </CollapsibleTrigger>
            ) : null}
          </div>
          <CollapsibleContent>
            <dl className="flex flex-col gap-1 md:flex-row md:gap-6">
              {event.contactEmail ? (
                <div className="flex items-baseline gap-3">
                  <dt className="text-sm text-muted-foreground">{t("event.email")}</dt>
                  <dd>
                    <a
                      className="break-all text-link underline underline-offset-4"
                      href={`mailto:${event.contactEmail}`}
                    >
                      {event.contactEmail}
                    </a>
                  </dd>
                </div>
              ) : null}
              {event.contactPhone ? (
                <div className="flex items-baseline gap-3">
                  <dt className="text-sm text-muted-foreground">{t("event.phone")}</dt>
                  <dd>
                    <a
                      className="text-link underline underline-offset-4"
                      href={`tel:${event.contactPhone.replace(/\s+/g, "")}`}
                    >
                      {event.contactPhone}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </CollapsibleContent>
        </Collapsible>
      </header>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {event.hasPhoto ? (
            <img
              src={catalogEventPhotoUrl(event.publicToken)}
              alt=""
              className="h-50 w-full rounded-2xl border border-border object-cover md:h-70"
            />
          ) : null}
          {paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="whitespace-pre-line"
            >
              {paragraph}
            </p>
          ))}
        </div>
        <Card className={cn("gap-3 rounded-xl p-4", isSticky && "md:sticky md:top-24")}>
          <h2 className="text-lg/6.5 font-semibold tracking-tight">{t("event.terms")}</h2>
          <div className="flex justify-between px-3 text-xs font-medium text-muted-foreground">
            <span>{t("event.termColumn")}</span>
            <span>{t("event.priceColumn")}</span>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {shownTerms.map((term) => (
              <li
                key={term.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-wash p-3"
              >
                <span className="flex flex-col">
                  <span className="font-medium tabular-nums">{termDates(term)}</span>
                  {termName(term) ? (
                    <span className="text-muted-foreground">{termName(term)}</span>
                  ) : null}
                </span>
                <span className="font-semibold whitespace-nowrap tabular-nums">
                  {formatTermPrice(term.priceCzk)}
                </span>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              aria-expanded={isTermsExpanded}
              onClick={() => setIsTermsExpanded(!isTermsExpanded)}
            >
              {isTermsExpanded
                ? t("event.showFewerTerms")
                : t("event.showMoreTerms", { count: hiddenCount })}
            </Button>
          ) : null}
          <Button
            asChild
            size="lg"
            className="w-full max-md:hidden"
          >
            {apply}
          </Button>
          <p className="text-center text-xs font-medium text-muted-foreground">
            {t("event.applyNote")}
          </p>
        </Card>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-border bg-card px-4 py-3 md:hidden">
        {price !== null ? (
          <p className="flex flex-col text-xs font-medium text-muted-foreground">
            <span className="text-base font-semibold whitespace-nowrap text-foreground">
              {event.terms.length > 1 ? `${t("price.from")} ` : null}
              {formatTermPrice(price)}
            </span>
            {t("price.perParticipant")}
          </p>
        ) : null}
        <Button
          asChild
          size="lg"
          className="w-55"
        >
          {apply}
        </Button>
      </div>
    </article>
  )
}
