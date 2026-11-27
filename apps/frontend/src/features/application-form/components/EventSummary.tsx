import { useTranslation } from "react-i18next"

import { TermPrice } from "@/components/atoms/MoneyAmount"
import { formatDateRange, formatMonthRange } from "@/lib/date"
import { termName } from "@/lib/term-label"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"

// Figma (Design system): "Akce a ceny termínů" in
// V07 https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15507-914
// M02 https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15507-1033

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
      className="flex flex-col gap-2 rounded-lg border border-border-strong bg-secondary p-4"
    >
      <h2 className="text-sm font-medium">{event.name}</h2>
      {where ? <p className="text-sm text-muted-foreground">{where}</p> : null}
      <ul className="flex flex-col">
        {event.terms.map((term) => (
          <li
            key={term.id}
            className="flex items-center justify-between gap-4 py-1"
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium">
                {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
              </span>
              {termName(term) ? (
                <>
                  <span className="sr-only"> · </span>
                  <span className="text-sm text-muted-foreground">{termName(term)}</span>
                </>
              ) : null}
            </span>
            <span className="sr-only"> · </span>
            <TermPrice
              className="text-sm font-medium"
              amountCzk={term.priceCzk}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
