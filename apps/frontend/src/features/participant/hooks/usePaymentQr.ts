import { useEffect, useState } from "react"
import QRCode from "qrcode"

/** The QR image (data URL) of a SPAYD string, generated locally; `null` until ready or when there is none. */
export function usePaymentQr(spayd: string | null): string | null {
  const [qr, setQr] = useState<{ payload: string; image: string } | null>(null)

  useEffect(() => {
    if (!spayd) return
    let isCurrent = true
    void QRCode.toDataURL(spayd, { width: 200, margin: 2 })
      .then((image) => {
        if (isCurrent) setQr({ payload: spayd, image })
      })
      .catch(() => {
        if (isCurrent) setQr(null)
      })
    return () => {
      isCurrent = false
    }
  }, [spayd])

  return qr?.payload === spayd ? qr.image : null
}
