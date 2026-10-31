import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import type { MyApplicationTerm, PaymentStatus } from "@/features/participant/api/applications"

/** Confirmed or waitlisted — the participant never sees a place in line. */
// Figma (Design system): DS / Badge Success / Neutral in U / Term status row · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13884-219
export function TermStatusBadge({ term }: { term: MyApplicationTerm }) {
  const { t } = useTranslation("participant")
  const isConfirmed = term.status === "CONFIRMED"
  const label = isConfirmed ? "confirmed" : term.status === "CANCELLED" ? "cancelled" : "waitlisted"

  return <Badge variant={isConfirmed ? "success" : "secondary"}>{t(`status.${label}`)}</Badge>
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
