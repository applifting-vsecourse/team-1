import { Copy } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { notify } from "@/lib/notify"

export function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useTranslation()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      notify.success(t("clipboard.copied"))
    } catch {
      notify.error(t("clipboard.failed"))
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={label}
      onClick={() => void copy()}
    >
      <Copy
        className="size-5"
        aria-hidden="true"
      />
    </Button>
  )
}
