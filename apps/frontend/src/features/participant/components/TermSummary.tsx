import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import type { MyApplicationTerm, PaymentStatus } from "@/features/participant/api/applications"

/** Awaiting evaluation, confirmed, waitlisted or cancelled — the participant never sees a place in line. */
// Figma (Design system v2): term status badges in US-54 / Moje přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2
export function TermStatusBadge({ term }: { term: MyApplicationTerm }) {
  const { t } = useTranslation("participant")
  const isConfirmed = term.status === "CONFIRMED"
  const label = (
    {
      TO_EVALUATE: "toEvaluate",
      CONFIRMED: "confirmed",
      WAITLISTED: "waitlisted",
      CANCELLED: "cancelled",
      ARCHIVED: "archived",
    } as const
  )[term.status]

  return <Badge variant={isConfirmed ? "success" : "secondary"}>{t(`status.${label}`)}</Badge>
}

const paymentTone = {
  UNPAID: "warning",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  OVERPAID: "info",
} as const

/** Unpaid, partly paid, paid or overpaid; nothing while no term is confirmed. */
// Figma (Design system v2): list of applications (the payment badge is not drawn there) · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15649-2
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useTranslation("participant")
  if (status === "NOTHING_DUE") return null

  return <Badge variant={paymentTone[status]}>{t(`paymentStatus.${status}`)}</Badge>
}
