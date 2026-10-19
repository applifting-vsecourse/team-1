import { useTranslation } from "react-i18next"

import { BrandDivider } from "@/components/atoms/BrandDivider"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { formatDateRange, formatMonthRange } from "@/lib/date"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"

// Figma (Design system): "Akce a ceny termínů" in
// V07 https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-2538
// M02 https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-18727

/** The event with the dates and prices of its terms — what the applicant chooses from. */
export function EventSummary({ event }: { event: PublicEvent }) {
  const { t } = useTranslation("applicationForm")
  const first = event.terms[0]
  const last = event.terms[event.terms.length - 1]
  const where = [
    event.location,
    first && last ? formatMonthRange(first.startsOn, last.endsOn) : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <section
      aria-label={t("form.heading", { event: event.name })}
      className="flex flex-col gap-4 rounded-lg border border-border bg-secondary p-4 sm:p-6"
    >
      <h2 className="text-lg font-bold tracking-tight">{event.name}</h2>
      {where ? <p className="text-sm text-muted-foreground">{where}</p> : null}
      <ul className="flex flex-col gap-4 text-sm">
        {event.terms.map((term) => (
          <li key={term.id}>
            {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })} ·{" "}
            <MoneyAmount amountCzk={term.priceCzk} />
          </li>
        ))}
      </ul>
      <BrandDivider />
    </section>
  )
}
