import { useTranslation } from "react-i18next"

import { usePaymentQr } from "@/hooks/usePaymentQr"
import { paymentSpayd } from "@/lib/payment-qr"

type TermPaymentQrProps = {
  bankAccount: string
  /** The debt of the term (not its price). */
  owedCzk: number
  variableSymbol: string
  eventName: string
}

/**
 * QR Platba of one term's debt: the organization's account, the debt, the term's variable symbol and
 * the event name as the message (US-41). Nothing is drawn when there is no debt or the account is unusable.
 */
// Figma (Design system v2): #311 Moje přihláška · Adam Dvořák · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22448-25936 (360 px: node-id=22448-26089)
export function TermPaymentQr({
  bankAccount,
  owedCzk,
  variableSymbol,
  eventName,
}: TermPaymentQrProps) {
  const { t } = useTranslation("common")
  const image = usePaymentQr(
    paymentSpayd({ bankAccount, amountCzk: owedCzk, variableSymbol, message: eventName }),
  )
  if (!image) return null

  return (
    <img
      src={image}
      width={200}
      height={200}
      className="size-50 max-w-full object-contain"
      alt={t("termPayment.qrAlt")}
    />
  )
}
