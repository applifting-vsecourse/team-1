import { useState } from "react"
import { Download } from "lucide-react"
import QRCode from "qrcode"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { usePaymentQr } from "@/hooks/usePaymentQr"

// Figma: #259 · Chyba stažení QR · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=22515-10865
export function PaymentQrDownload({
  spayd,
  variableSymbol,
}: {
  spayd: string
  variableSymbol: string
}) {
  const { t } = useTranslation("common")
  const image = usePaymentQr(spayd)
  const [isSaving, setSaving] = useState(false)
  const [hasFailed, setFailed] = useState(false)
  const save = async () => {
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
    <div className="flex min-w-0 flex-col items-center gap-2">
      {image && (
        <img
          src={image}
          width={200}
          height={200}
          className="size-40 sm:size-32"
          alt={t("termPayment.summaryQrAlt")}
        />
      )}
      <Button
        type="button"
        variant="outline"
        disabled={isSaving}
        onClick={() => void save()}
      >
        <Download aria-hidden />
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
