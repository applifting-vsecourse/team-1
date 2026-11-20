import { useTranslation } from "react-i18next"

import close from "@/assets/toasts/close.svg"
import error from "@/assets/toasts/error.svg"
import info from "@/assets/toasts/info.svg"
import success from "@/assets/toasts/success.svg"
import warning from "@/assets/toasts/warn.svg"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

function toastIcon(asset: string, className: string) {
  return (
    <span
      aria-hidden="true"
      className={cn("block size-5 bg-current mask-contain mask-center mask-no-repeat", className)}
      style={{ maskImage: `url("${asset}")` }}
    />
  )
}

// Figma v2: Togena / Feedback / Toast · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=19786-50278
export function AppToaster() {
  const { t } = useTranslation("common")
  return (
    <Toaster
      closeButton
      position="bottom-right"
      offset={24}
      mobileOffset={16}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: t("close"),
        classNames: {
          toast:
            "flex min-h-[58px] w-full items-center gap-3 rounded-lg border bg-popover p-4 text-sm leading-5 text-popover-foreground shadow-md",
          icon: "size-5 shrink-0",
          content: "flex min-w-0 flex-1 flex-col gap-1 break-words",
          title: "font-bold",
          description: "text-muted-foreground",
          closeButton:
            "order-last flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring",
        },
      }}
      icons={{
        success: toastIcon(success, "text-status-success"),
        info: toastIcon(info, "text-status-info"),
        warning: toastIcon(warning, "text-status-warning"),
        error: toastIcon(error, "text-action-destructive"),
        close: toastIcon(close, "size-6"),
      }}
    />
  )
}
