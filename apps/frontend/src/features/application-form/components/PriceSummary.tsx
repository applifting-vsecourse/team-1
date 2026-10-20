import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"
import { formatCzk } from "@/lib/money"

import type { ParticipantPrice } from "@/features/application-form/lib/selection-price"

// Figma (Design system): "Průběžná cena" block of V02 Přihláška bez účtu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11967-2
// V02a (price after adding a term) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12238-426

export type PriceSummaryRow = ParticipantPrice & {
  /** Already resolved: the typed name or "Participant N". */
  label: string
}

type PriceSummaryProps = {
  rows: PriceSummaryRow[]
  totalCzk: number
}

/** Preliminary price of the application, per participant and in total; updates with every tick. */
export function PriceSummary({ rows, totalCzk }: PriceSummaryProps) {
  const { t } = useTranslation("applicationForm")

  return (
    <Card className="gap-4 p-4 sm:p-6">
      <h2
        className="text-lg font-semibold"
        aria-live="polite"
      >
        {t("price.heading", { total: formatCzk(totalCzk) })}
      </h2>
      <ul className="text-base">
        {rows.map((row, index) => (
          <li key={index}>
            {t("price.row", {
              name: row.label,
              count: row.termCount,
              price: formatCzk(row.priceCzk),
            })}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{t("price.note")}</p>
    </Card>
  )
}
