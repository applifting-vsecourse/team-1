import { useRef } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Confirmation before the applicant's entries are thrown away (US-179): „Začít znovu“ asks first
// (Google Forms „Clear form“). The dialog itself is not drawn in Figma; the button is 27443-16693.
export function ClearFormDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  focusAfterClear,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onConfirm: () => void
  /** The button that opened the dialog is gone once the form is empty, so focus goes here instead. */
  focusAfterClear: () => void
}) {
  const { t } = useTranslation("applicationForm")
  const hasCleared = useRef(false)
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="gap-4 p-6 sm:max-w-130"
        onCloseAutoFocus={(closeEvent) => {
          if (!hasCleared.current) return
          hasCleared.current = false
          closeEvent.preventDefault()
          focusAfterClear()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg tracking-tight">{t("form.clearTitle")}</DialogTitle>
          <DialogDescription>{t("form.clearDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            {t("form.clearCancel")}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              hasCleared.current = true
              onConfirm()
            }}
          >
            {t("form.clearConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
