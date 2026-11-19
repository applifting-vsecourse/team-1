import { useRef, useState } from "react"
import { Copy } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { notify } from "@/lib/notify"

export function CopyButton({
  value,
  label,
  successMessage,
  errorMessage,
  showLabel: shouldShowLabel = false,
}: {
  value: string
  label: string
  showLabel?: boolean
  successMessage?: string
  errorMessage?: string
}) {
  const [isFallbackOpen, setIsFallbackOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const [copyCount, setCopyCount] = useState(0)
  const { t } = useTranslation()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyCount((count) => count + 1)
      notify.success(successMessage ?? t("clipboard.copied"))
    } catch {
      setCopyCount(0)
      if (errorMessage) notify.error(errorMessage)
      setIsFallbackOpen(true)
    }
  }

  return (
    <>
      <Button
        ref={trigger}
        type="button"
        variant="ghost"
        size={shouldShowLabel ? "default" : "icon-lg"}
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
        {shouldShowLabel ? label : null}
      </Button>
      <Dialog
        open={isFallbackOpen}
        onOpenChange={setIsFallbackOpen}
      >
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            field.current?.focus()
            field.current?.select()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            trigger.current?.focus()
          }}
        >
          <DialogTitle>{t("clipboard.failedTitle")}</DialogTitle>
          <DialogDescription>{t("clipboard.failedDescription")}</DialogDescription>
          <Input
            ref={field}
            readOnly
            aria-label={label}
            value={value}
            onFocus={(event) => event.currentTarget.select()}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
