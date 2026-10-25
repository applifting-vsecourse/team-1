import { Copy } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useTranslation()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t("clipboard.copied"))
    } catch {
      toast.error(t("clipboard.failed"))
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
