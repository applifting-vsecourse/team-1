import type { ReactNode } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/** One labelled fact of a bulk dialog: a small muted label above its value. */
export function BulkDetail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div>{value}</div>
    </div>
  )
}

/**
 * The frame the three bulk dialogs share (confirm, waitlist, reject; US-107, US-108): title with a
 * close button, labelled details, and a footer with Cancel beside the action (stacked on mobile,
 * the action first).
 */
export function BulkActionDialog({
  title,
  isBusy,
  submit,
  onClose,
  children,
}: {
  title: string
  isBusy: boolean
  submit: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useTranslation("eventOverview")
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isBusy) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:p-4 max-sm:shadow-none sm:max-w-160"
      >
        <DialogHeader className="flex-row items-start gap-4 text-left">
          <DialogTitle className="flex-1 text-2xl tracking-tight">{title}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            aria-label={t("bulk.close")}
            disabled={isBusy}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </DialogHeader>
        {children}
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button
            variant="outline"
            size="lg"
            className="h-12 md:min-w-40"
            disabled={isBusy}
            onClick={onClose}
          >
            {t("bulk.cancel")}
          </Button>
          {submit}
        </div>
      </DialogContent>
    </Dialog>
  )
}
