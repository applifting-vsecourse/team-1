import { useTranslation } from "react-i18next"

import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Card } from "@/components/ui/card"

import type { MyApplication } from "@/features/participant/api/applications"
import { termRangeShort } from "@/features/participant/lib/format"

type PaymentSummaryProps = {
  application: MyApplication
}

/** What is due, what is paid and where to send the rest — only for applications with a confirmed term (US-25). */
// Figma (Design system): U04 Moje přihláška, blok „Platba a údaje pro doplatek“ · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12926-110
export function PaymentSummary({ application }: PaymentSummaryProps) {
  const { t } = useTranslation("participant")
  const { paymentDetails, amountDueCzk, amountPaidCzk, amountOwedCzk } = application
  if (!paymentDetails) return null

  const isOverpaid = amountOwedCzk < 0
  const hasToPay = amountOwedCzk > 0
  const waitlisted = application.terms.filter((term) => term.status === "WAITLISTED")

  return (
    <Card className="gap-4 p-6">
      <h2 className="text-2xl font-semibold tracking-tight">{t("payment.title")}</h2>
      <dl className="grid gap-4 sm:grid-cols-3">
        <Tile
          label={t("payment.due")}
          amountCzk={amountDueCzk}
        />
        <Tile
          label={t("payment.paid")}
          amountCzk={amountPaidCzk}
        />
        <Tile
          label={isOverpaid ? t("payment.overpaid") : t("payment.owed")}
          amountCzk={Math.abs(amountOwedCzk)}
        />
      </dl>
      <h3 className="mt-2 border-t pt-6 text-lg font-semibold tracking-tight">
        {hasToPay ? t("payment.transferTitle") : t("payment.detailsTitle")}
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] sm:gap-x-4 sm:gap-y-2 [&>dd]:mb-3 sm:[&>dd]:mb-0">
        <dt className="text-muted-foreground">{t("payment.account")}</dt>
        <dd className="font-semibold">{paymentDetails.bankAccount}</dd>
        <dt className="text-muted-foreground">{t("payment.variableSymbol")}</dt>
        <dd className="font-semibold">{paymentDetails.variableSymbol}</dd>
        {hasToPay ? (
          <>
            <dt className="text-muted-foreground">{t("payment.toPay")}</dt>
            <dd className="font-semibold">
              <MoneyAmount amountCzk={amountOwedCzk} />
            </dd>
          </>
        ) : null}
      </dl>
      <p className="text-sm text-muted-foreground">
        {[
          hasToPay ? t("payment.note") : null,
          waitlisted.length > 0
            ? t("payment.waitlistedNote", { range: waitlisted.map(termRangeShort).join(", ") })
            : null,
        ]
          .filter(Boolean)
          .join(" ")}
      </p>
    </Card>
  )
}

function Tile({ label, amountCzk }: { label: string; amountCzk: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-accent/40 p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold">
        <MoneyAmount amountCzk={amountCzk} />
      </dd>
    </div>
  )
}
