import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { CopyButton } from "@/components/atoms/CopyButton"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export type TermPaymentStatus =
  "NOTHING_DUE" | "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERPAID" | "WAITLISTED"

type TermPaymentCardProps = {
  /** The term: its dates, with the name when it has one. */
  title: string
  status: TermPaymentStatus
  dueCzk: number
  paidCzk: number
  /** Due minus paid; negative is an overpayment of this term. */
  owedCzk: number
  bankAccount: string
  variableSymbol: string
  /** What the viewer can do with the term, e.g. the organizer's "record a payment". */
  action?: ReactNode
}

const badgeVariant = {
  NOTHING_DUE: "secondary",
  UNPAID: "secondary",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERPAID: "info",
} as const

/**
 * The payment of one term: what is due, what is paid and what is left, with the account and the
 * variable symbol of the term (US-110). A paid term is a collapsed card (date and badge) that opens
 * to the detail; a waitlisted one only says nothing is paid yet.
 */
// Figma (Design system): Karta termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19446-14246
// Figma (Design system): Detail přihlášky · Platby · Dluh 500 + 700 Kč · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15845-628 (360 px: node-id=15845-736)
// Figma (Design system): Detail přihlášky · Platby · Oba termíny zaplacené #203 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19446-22050 (360 px: node-id=19446-22404)
// Figma (Design system): Detail přihlášky · Platby · Jeden termín rozbalený #203 · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19446-22213 (360 px: node-id=19446-22517)
// Figma (Design system): Detail přihlášky · Platby · Náhradník v jednom termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19448-8297 (360 px: node-id=19448-8571)
export function TermPaymentCard({
  title,
  status,
  dueCzk,
  paidCzk,
  owedCzk,
  bankAccount,
  variableSymbol,
  action,
}: TermPaymentCardProps) {
  const { t } = useTranslation("common")

  if (status === "WAITLISTED") {
    return (
      <Card className="gap-2 p-6">
        <h3 className="text-lg font-semibold">
          {title} · {t("termPayment.waitlisted")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("termPayment.waitlistedNote")}</p>
      </Card>
    )
  }

  const statusBadge = (
    <Badge variant={badgeVariant[status]}>{t(`termPayment.status.${status}`)}</Badge>
  )
  const heading = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-lg font-semibold">
        {title}
        {/* The accessible name reads "12.–18. 7. 2027, Paid". */}
        <span className="sr-only">{", "}</span>
      </span>
      {statusBadge}
    </span>
  )
  const detail = (
    <>
      <dl className="flex flex-col gap-2 text-sm">
        <Row label={t("termPayment.due")}>
          <MoneyAmount amountCzk={dueCzk} />
        </Row>
        <Row label={t("termPayment.paid")}>
          <MoneyAmount amountCzk={paidCzk} />
        </Row>
        <Row
          label={t(owedCzk < 0 ? "termPayment.overpaid" : "termPayment.owed")}
          isLarge
        >
          <MoneyAmount amountCzk={Math.abs(owedCzk)} />
        </Row>
      </dl>
      {status === "UNPAID" || status === "PARTIALLY_PAID" || status === "PAID" ? (
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold">{t("termPayment.paymentDetails")}</h4>
          <dl className="flex flex-col text-sm">
            {owedCzk > 0 ? (
              <CopyRow
                label={t("termPayment.amountToPay")}
                value={String(owedCzk)}
                copyLabel={t("clipboard.copyAmount")}
              >
                <MoneyAmount amountCzk={owedCzk} />
              </CopyRow>
            ) : null}
            <CopyRow
              label={t("termPayment.account")}
              value={bankAccount}
              copyLabel={t("clipboard.copyAccount")}
            >
              <span className="break-all">{bankAccount}</span>
            </CopyRow>
            <CopyRow
              label={t("termPayment.variableSymbol")}
              value={variableSymbol}
              copyLabel={t("clipboard.copyVariableSymbol")}
            >
              <span className="break-all">{variableSymbol}</span>
            </CopyRow>
          </dl>
        </div>
      ) : null}
    </>
  )

  if (status === "PAID") {
    return (
      <Card className="gap-0 p-0">
        <Accordion
          type="single"
          collapsible
        >
          <AccordionItem
            value="detail"
            className="border-b-0"
          >
            <AccordionTrigger className="min-h-11 items-center px-6 hover:no-underline">
              {heading}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 px-6">
              {detail}
              {action}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    )
  }

  return (
    <Card className="gap-4 p-6">
      <h3>{heading}</h3>
      {detail}
      {action}
    </Card>
  )
}

/** The cards of one application, side by side on a desktop and one under another on a phone. */
export function TermPaymentCards({ children }: { children: ReactNode }) {
  const { t } = useTranslation("common")

  return (
    <section className="flex flex-col gap-4">
      <h2 className="sr-only">{t("termPayment.listTitle")}</h2>
      <div className="grid items-start gap-6 md:grid-cols-2">{children}</div>
    </section>
  )
}

function Row({
  label,
  isLarge = false,
  children,
}: {
  label: string
  isLarge?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={isLarge ? "text-base font-medium" : undefined}>{children}</dd>
    </div>
  )
}

function CopyRow({
  label,
  value,
  copyLabel,
  children,
}: {
  label: string
  value: string
  copyLabel: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        {children}
        <CopyButton
          value={value}
          label={copyLabel}
        />
      </dd>
    </div>
  )
}
