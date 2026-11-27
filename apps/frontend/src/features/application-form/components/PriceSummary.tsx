import { useId, useState, type ReactNode } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useTranslation } from "react-i18next"

import { MoneyAmount, TermPrice } from "@/components/atoms/MoneyAmount"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"

import type { PriceRow } from "@/features/application-form/lib/selection-price"

type PriceSummaryProps = {
  rows: PriceRow[]
  totalCzk: number
  /** The review step shows only the total next to the submit button. */
  isReview: boolean
  /** A failed submission, above the action. */
  alert?: ReactNode
  /** The one primary action of the step. */
  action: ReactNode
}

/** One ticked term of one participant (or the participant without a term) and its price. */
function PriceRows({ rows, id }: { rows: PriceRow[]; id?: string }) {
  const { t } = useTranslation("applicationForm")
  return (
    <ul
      id={id}
      className="flex flex-col gap-4"
    >
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex items-center justify-between gap-2 text-sm"
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-medium">
              {row.term
                ? formatDateRange(row.term.startsOn, row.term.endsOn, { shouldShowYear: true })
                : t("price.noTerms")}
            </span>
            <span className="text-muted-foreground">{row.participant}</span>
          </span>
          {row.term ? (
            <TermPrice
              className="font-medium"
              amountCzk={row.priceCzk}
            />
          ) : (
            <MoneyAmount
              className="font-medium"
              amountCzk={row.priceCzk}
            />
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * The price next to the form from `lg`: every ticked term per participant, the total and the
 * step's action. Updates with every tick.
 */
// Figma (Design system v2): Souhrn přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=18923-3386
// (no term 18923-3187, review 18923-4573, submitting 18923-4733)
export function PriceSummary({ rows, totalCzk, isReview, alert, action }: PriceSummaryProps) {
  const { t } = useTranslation("applicationForm")

  return (
    <Card
      role="region"
      aria-label={t("price.heading")}
      className="gap-4 bg-brand-warm-subtle p-4"
    >
      {isReview ? null : (
        <>
          <h2 className="text-2xl font-bold">{t("price.heading")}</h2>
          <PriceRows rows={rows} />
        </>
      )}
      <p
        aria-live="polite"
        className="flex items-center justify-between gap-2"
      >
        <span className="text-sm font-bold">{t("price.total")}</span>
        <MoneyAmount
          className="text-2xl font-bold"
          amountCzk={totalCzk}
        />
      </p>
      {alert}
      {action}
    </Card>
  )
}

/**
 * Below `lg` the price is a bar fixed to the bottom of the screen: the total opens the rows
 * upwards, the step's action sits next to it (Stripe Checkout, Airbnb).
 */
// Figma (Design system v2): Lišta ceny · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27443-16659
// (expanded 27443-16726, review 27444-16691, submitting 27444-16724)
export function PriceBar({ rows, totalCzk, alert, action }: Omit<PriceSummaryProps, "isReview">) {
  const { t } = useTranslation("applicationForm")
  const [isOpen, setIsOpen] = useState(false)
  const rowsId = useId()
  const Chevron = isOpen ? ChevronDown : ChevronUp

  return (
    <section
      aria-label={t("price.heading")}
      data-price-bar
      className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-3 border-t border-border-strong bg-card px-4 pt-3 pb-4"
    >
      {isOpen ? (
        <div className="border-b border-border pt-1 pb-3">
          <PriceRows
            id={rowsId}
            rows={rows}
          />
        </div>
      ) : null}
      {alert}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          aria-expanded={isOpen}
          aria-controls={isOpen ? rowsId : undefined}
          className="-ml-2 h-auto flex-col items-start gap-0 px-2 py-0"
          onClick={() => setIsOpen((isShown) => !isShown)}
        >
          <span className="flex items-center gap-1 font-normal text-muted-foreground">
            {t("price.total")}
            <Chevron
              aria-hidden
              className="size-4"
            />
          </span>
          <span aria-live="polite">
            <MoneyAmount
              className="text-xl font-bold"
              amountCzk={totalCzk}
            />
          </span>
        </Button>
        <div className="min-w-0 flex-1">{action}</div>
      </div>
    </section>
  )
}
