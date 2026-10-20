import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Card } from "@/components/ui/card"

import type { ParticipantPrice } from "@/features/application-form/lib/selection-price"

// Figma (Design system): "Cena vybraných termínů" in
// V07a https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-2708
// M02a https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-18899
// rows: "DS / Price row" https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13196-780

export type PriceSummaryRow = ParticipantPrice & {
  /** Already resolved: the typed name or "Participant N". */
  label: string
}

type PriceSummaryProps = {
  rows: PriceSummaryRow[]
  totalCzk: number
}

/** Price of the ticked terms, per participant and in total; updates with every tick. */
export function PriceSummary({ rows, totalCzk }: PriceSummaryProps) {
  const { t } = useTranslation("applicationForm")

  return (
    <Card className="gap-4 p-4 sm:p-6">
      <h2 className="text-lg font-bold">{t("price.heading")}</h2>
      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex flex-col">
              <span className="font-semibold">{row.label}</span>
              <span className="text-sm text-muted-foreground">
                {row.termCount === 0
                  ? t("price.noTerms")
                  : t("price.terms", { count: row.termCount })}
              </span>
            </span>
            <MoneyAmount
              className="font-bold"
              amountCzk={row.priceCzk}
            />
          </li>
        ))}
      </ul>
      <p
        aria-live="polite"
        className="flex items-center justify-between gap-4 border-t border-border pt-4"
      >
        <span className="text-lg font-semibold">{t("price.total")}</span>
        <MoneyAmount
          className="text-3xl font-bold tracking-tight"
          amountCzk={totalCzk}
        />
      </p>
      <p className="text-sm text-muted-foreground">{t("price.note")}</p>
    </Card>
  )
}
