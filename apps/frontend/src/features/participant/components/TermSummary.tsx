import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import type { MyApplicationTerm, PaymentStatus } from "@/features/participant/api/applications"
import { termRange } from "@/features/participant/lib/format"

/** The term's dates with the year and its name underneath. */
// Figma (Design system): U / Term status row · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13884-219
export function TermLabel({ term }: { term: MyApplicationTerm }) {
  return (
    <span className="flex flex-1 flex-col">
      <span className="font-medium tabular-nums">{termRange(term)}</span>
      <span className="sr-only"> · </span>
      <span className="text-sm text-muted-foreground">{term.name}</span>
    </span>
  )
}

/** Confirmed, or waiting for confirmation — the participant never sees a place in line. */
// Figma (Design system): DS / Badge Success / Neutral in U / Term status row · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13884-219
export function TermStatusBadge({ term }: { term: MyApplicationTerm }) {
  const { t } = useTranslation("participant")
  const isConfirmed = term.status === "CONFIRMED"

  return (
    <Badge variant={isConfirmed ? "success" : "secondary"}>
      {isConfirmed ? t("status.confirmed") : t("status.pending")}
    </Badge>
  )
}

const paymentTone = {
  UNPAID: "warning",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERPAID: "info",
} as const

/** Unpaid, partly paid, paid or overpaid; nothing while no term is confirmed. */
// Figma (Design system): U01 Přihlášky, štítek platby · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12092-104
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useTranslation("participant")
  if (status === "NOTHING_DUE") return null

  return <Badge variant={paymentTone[status]}>{t(`paymentStatus.${status}`)}</Badge>
}
