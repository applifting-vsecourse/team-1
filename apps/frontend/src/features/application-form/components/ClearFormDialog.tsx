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

// Confirmation before the applicant's entries are thrown away (US-179). Not in Figma yet.
export function ClearFormDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onConfirm: () => void
}) {
  const { t } = useTranslation("applicationForm")
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="gap-4 p-6 sm:max-w-130">
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
            onClick={onConfirm}
          >
            {t("form.clearConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
