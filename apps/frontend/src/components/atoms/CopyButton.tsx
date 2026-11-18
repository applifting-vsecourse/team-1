import { useState } from "react"
import { Copy } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { notify } from "@/lib/notify"

export function CopyButton({
  value,
  label,
  successMessage,
}: {
  value: string
  label: string
  successMessage?: string
}) {
  const [copyCount, setCopyCount] = useState(0)
  const { t } = useTranslation()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyCount((count) => count + 1)
      notify.success(successMessage ?? t("clipboard.copied"))
    } catch {
      notify.error(t("clipboard.failedTitle"), t("clipboard.failedDescription"))
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className="relative"
      aria-label={label}
      onClick={() => void copy()}
    >
      {copyCount > 0 && (
        <span
          key={copyCount}
          aria-hidden="true"
          className="copy-confirmation"
        />
      )}
      <Copy
        className="size-5"
        aria-hidden="true"
      />
    </Button>
  )
}
