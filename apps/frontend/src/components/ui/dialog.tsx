import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return (
    <DialogPrimitive.Root
      data-slot="dialog"
      {...props}
    />
  )
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      {...props}
    />
  )
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return (
    <DialogPrimitive.Portal
      data-slot="dialog-portal"
      {...props}
    />
  )
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      {...props}
    />
  )
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  )
}

// The on-screen keyboard can resize the visual viewport without resizing the layout viewport.
function useDialogViewport() {
  const [viewportState, setViewportState] = React.useState<{
    style: React.CSSProperties
    isConstrained: boolean
  }>()

  React.useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const updateViewport = () => {
      if (viewport.scale !== 1) {
        setViewportState(undefined)
        return
      }

      setViewportState({
        style: {
          "--dialog-viewport-top": `${viewport.offsetTop}px`,
          "--dialog-viewport-center": `${viewport.offsetTop + viewport.height / 2}px`,
          "--dialog-viewport-height": `${viewport.height}px`,
        } as React.CSSProperties,
        isConstrained: viewport.height < window.innerHeight,
      })
    }

    updateViewport()
    viewport.addEventListener("resize", updateViewport)
    viewport.addEventListener("scroll", updateViewport)
    return () => {
      viewport.removeEventListener("resize", updateViewport)
      viewport.removeEventListener("scroll", updateViewport)
    }
  }, [])

  return viewportState
}

// Figma (Design system v2): Togena / Dialogs / Dialog · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15199-795
// Close sits in the header row (24 px inset, 44 px target); the shadow stays (DESIGN.md: dialogs float).
function DialogContent({
  className,
  children,
  showCloseButton = true,
  style,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const { t } = useTranslation("common")
  const viewport = useDialogViewport()
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-visual-viewport-constrained={viewport?.isConstrained || undefined}
        style={{ ...viewport?.style, ...style }}
        className={cn(
          "fixed top-[var(--dialog-viewport-center,50%)] left-[50%] z-50 grid max-h-[calc(var(--dialog-viewport-height,100dvh)-2rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] grid-cols-[minmax(0,1fr)] gap-5 overflow-y-auto overscroll-contain rounded-lg border bg-card p-6 wrap-anywhere shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          showCloseButton &&
            "[&_[data-slot=dialog-header]]:pr-15 [&>[data-slot=dialog-title]]:pr-15",
          className,
          // Keep the cap when a caller sets height limits based on the layout viewport.
          "data-[visual-viewport-constrained=true]:max-h-[calc(var(--dialog-viewport-height)-2rem)] data-[visual-viewport-constrained=true]:min-h-0",
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-[18px] right-6 inline-flex size-11 items-center justify-center rounded-control transition-colors outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5"
          >
            <XIcon />
            <span className="sr-only">{t("close")}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  )
}

// Put the secondary action first so DOM order also works for both footer layouts.
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  const { t } = useTranslation("common")
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end sm:*:flex-1 [&>button]:h-auto [&>button]:text-center [&>button]:whitespace-normal [&>button[data-size=default]]:min-h-10 [&>button[data-size=lg]]:min-h-11 [&>button[data-size=lg]]:py-2",
        className,
      )}
      {...props}
    >
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">{t("close")}</Button>
        </DialogPrimitive.Close>
      )}
      {children}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-2xl font-bold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-base text-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
