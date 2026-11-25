import type { ReactNode } from "react"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** The names of the selected applications, one per line, scrolling when there are many. */
export function BulkNames({ names }: { names: string[] }) {
  return (
    <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
      {names.map((name, index) => (
        <li key={`${name}-${index}`}>{name}</li>
      ))}
    </ul>
  )
}

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
  isFullScreenOnMobile = true,
  children,
}: {
  title: string
  isBusy: boolean
  submit: ReactNode
  onClose: () => void
  /** On a phone the dialog fills the screen; false keeps it a centered modal (US-140). */
  isFullScreenOnMobile?: boolean
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
        className={cn(
          "max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-160",
          isFullScreenOnMobile &&
            "max-sm:top-0 max-sm:left-0 max-sm:flex max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:flex-col max-sm:gap-4 max-sm:rounded-none max-sm:p-4 max-sm:shadow-none",
        )}
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
        <div
          className={cn(
            "flex min-h-0 flex-col gap-4",
            isFullScreenOnMobile && "max-sm:flex-1 max-sm:overflow-y-auto",
          )}
        >
          {children}
        </div>
        <DialogFooter className={cn(isFullScreenOnMobile && "max-sm:pt-2")}>
          <Button
            variant="outline"
            size="lg"
            disabled={isBusy}
            onClick={onClose}
          >
            {t("bulk.cancel")}
          </Button>
          {submit}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
