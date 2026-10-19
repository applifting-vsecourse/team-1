import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { formatDate } from "@/lib/date"

import type { PublicTerm } from "@/features/application-form/api/publicEvent"

export function termDates(term: PublicTerm) {
  return `${formatDate(term.startsOn)} – ${formatDate(term.endsOn)}`
}

/** The terms of the event with prices — what the applicant chooses from. */
export function TermsList({ terms }: { terms: PublicTerm[] }) {
  const { t } = useTranslation("applicationForm")

  return (
    <section
      aria-labelledby="terms-heading"
      className="flex flex-col gap-3"
    >
      <h2
        id="terms-heading"
        className="text-lg font-semibold tracking-tight"
      >
        {t("form.termsHeading")}
      </h2>
      <ul className="divide-y divide-border border-y border-border">
        {terms.map((term) => (
          <li
            key={term.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
          >
            <div className="flex min-w-0 flex-col">
              <span className="font-medium">{term.name}</span>
              <span className="text-sm text-muted-foreground">{termDates(term)}</span>
            </div>
            <MoneyAmount
              amountCzk={term.priceCzk}
              className="font-medium"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
