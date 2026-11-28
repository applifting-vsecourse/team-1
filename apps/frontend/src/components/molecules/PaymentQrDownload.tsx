import { useState } from "react"
import { Download } from "lucide-react"
import QRCode from "qrcode"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { usePaymentQr } from "@/hooks/usePaymentQr"

// Figma: #259 · Chyba stažení QR · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=22515-10865
// `inline` (a summary row after sending the application, 27439-16621 / 16627): from `sm` a small code
// next to a text-only button, below it the code above the button; centred in the row either way.
export function PaymentQrDownload({
  spayd,
  variableSymbol,
  layout = "stacked",
}: {
  spayd: string | null
  variableSymbol: string
  layout?: "stacked" | "inline"
}) {
  const isInline = layout === "inline"
  const { t } = useTranslation("common")
  const image = usePaymentQr(spayd)
  const [isSaving, setSaving] = useState(false)
  const [hasFailed, setFailed] = useState(false)
  const save = async () => {
    if (!spayd) return
    setSaving(true)
    setFailed(false)
    try {
      const link = document.createElement("a")
      link.href = image ?? (await QRCode.toDataURL(spayd, { width: 200, margin: 2 }))
      link.download = `qr-${variableSymbol}.png`
      link.click()
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div
      className={
        isInline
          ? "flex w-full min-w-0 flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4"
          : "flex min-w-0 flex-col items-center gap-2"
      }
    >
      {image && (
        <img
          src={image}
          width={200}
          height={200}
          className={isInline ? "size-40 sm:size-28" : "size-40"}
          alt={t("termPayment.summaryQrAlt")}
        />
      )}
      <Button
        type="button"
        variant="outline"
        className={isInline ? "min-w-55" : undefined}
        disabled={!spayd || isSaving}
        onClick={() => void save()}
      >
        {isInline ? null : <Download aria-hidden />}
        {t("termPayment.saveQr")}
      </Button>
      {hasFailed && (
        <Alert variant="destructive">
          <AlertTitle>{t("termPayment.downloadError")}</AlertTitle>
          <AlertDescription>{t("termPayment.retryDownload")}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
