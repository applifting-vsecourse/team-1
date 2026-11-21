import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Card } from "@/components/ui/card"

import type { ParticipantPrice } from "@/features/application-form/lib/selection-price"

// Figma (Design system): "Cena vybraných termínů" in
// V07 https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15507-914
// M02 https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15507-1033

export type PriceSummaryRow = ParticipantPrice & {
  /** Already resolved: the typed name or "Participant N". */
  label: string
}

type PriceSummaryProps = {
  children?: ReactNode
  rows: PriceSummaryRow[]
  totalCzk: number
}

/** Price of the ticked terms, per participant and in total; updates with every tick. */
export function PriceSummary({ rows, totalCzk, children }: PriceSummaryProps) {
  const { t } = useTranslation("applicationForm")

  return (
    <Card className="gap-4 p-[15px]">
      <h2 className="text-2xl font-semibold">{t("price.heading")}</h2>
      <p className="text-sm font-bold">{t("price.participants", { count: rows.length })}</p>
      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium">{row.label}</span>
              <span className="text-sm text-muted-foreground">
                {row.termCount === 0
                  ? t("price.noTerms")
                  : t("price.terms", { count: row.termCount })}
              </span>
            </span>
            <MoneyAmount
              className="text-sm font-medium"
              amountCzk={row.priceCzk}
            />
          </li>
        ))}
      </ul>
      <p
        aria-live="polite"
        className="flex items-center justify-between gap-2"
      >
        <span className="text-sm font-medium">{t("price.total")}</span>
        <MoneyAmount
          className="text-2xl/5 font-medium"
          amountCzk={totalCzk}
        />
      </p>
      <p className="text-sm text-muted-foreground">{t("price.note")}</p>
      {children}
    </Card>
  )
}
