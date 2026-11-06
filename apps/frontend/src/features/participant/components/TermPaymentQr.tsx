import { useTranslation } from "react-i18next"

import { usePaymentQr } from "@/features/participant/hooks/usePaymentQr"
import { paymentSpayd } from "@/features/participant/lib/payment-qr"

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
// Figma (Design system): #311 Moje přihláška · Adam Dvořák · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19799-15345 (360 px: node-id=19799-15493)
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
      className="mt-2 size-40 sm:size-50"
      alt={t("termPayment.qrAlt")}
    />
  )
}
