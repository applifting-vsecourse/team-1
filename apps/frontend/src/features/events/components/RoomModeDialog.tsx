import { useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiErrorCode } from "@/lib/api-client"

import { setRoomMode, type EventRooms, type RoomMode } from "@/features/events/api/rooms"

// Figma (Design system): X24a–c / Změna režimu pokojů
// https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13912-322
// https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13912-528
// https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13912-560
export function RoomModeDialog({
  event,
  targetMode,
  onClose,
  onSaved,
}: {
  event: EventRooms
  targetMode: RoomMode
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = useTranslation("events")
  const cancelRef = useRef<HTMLButtonElement>(null)
  const mutation = useMutation({
    mutationFn: () => setRoomMode(event.eventId, targetMode),
    onSuccess: async () => {
      await onSaved()
      onClose()
    },
  })
  const isBlocked =
    targetMode === "GENDERED" &&
    (event.rooms.length > 0 || apiErrorCode(mutation.error) === "ROOM_MODE_REQUIRES_EMPTY_ROOMS")
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-170"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          cancelRef.current?.focus()
        }}
      >
        <p className="text-xs font-medium text-muted-foreground uppercase">{event.eventName}</p>
        <div className="flex items-center justify-between gap-4">
          <DialogTitle>
            {t(isBlocked ? "rooms.modeChange.blockedTitle" : "rooms.modeChange.title")}
          </DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={mutation.isPending}
              aria-label={t("rooms.close")}
            >
              <X className="size-5" />
            </Button>
          </DialogClose>
        </div>
        <Alert className="border-status-warning bg-status-warning-bg p-6">
          <AlertTitle className="text-lg text-status-warning">
            {t(
              isBlocked
                ? "rooms.modeChange.blockedHeading"
                : targetMode === "SHARED"
                  ? "rooms.modeChange.sharedHeading"
                  : "rooms.modeChange.genderedHeading",
            )}
          </AlertTitle>
          <AlertDescription className="text-foreground">
            {t(
              isBlocked
                ? "rooms.modeChange.blockedBody"
                : targetMode === "SHARED"
                  ? "rooms.modeChange.sharedBody"
                  : "rooms.modeChange.genderedBody",
            )}
          </AlertDescription>
        </Alert>
        <DialogDescription className="text-base text-foreground">
          {t(event.roomMode === "GENDERED" ? "rooms.genderedMode" : "rooms.sharedMode")} →{" "}
          {t(targetMode === "GENDERED" ? "rooms.genderedMode" : "rooms.sharedMode")}
        </DialogDescription>
        <p className="text-sm text-muted-foreground">
          {t(isBlocked ? "rooms.modeChange.blockedHint" : "rooms.modeChange.hint")}
        </p>
        {mutation.isError && !isBlocked ? (
          <ErrorState
            title={t("rooms.saveFailed")}
            error={mutation.error}
          />
        ) : null}
        <DialogFooter className="gap-4">
          <DialogClose asChild>
            <Button
              ref={cancelRef}
              variant="outline"
              size="lg"
              className="sm:w-38"
              disabled={mutation.isPending}
            >
              {t(isBlocked ? "rooms.modeChange.understood" : "rooms.modeChange.cancel")}
            </Button>
          </DialogClose>
          {!isBlocked ? (
            <Button
              size="lg"
              className="sm:w-38"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
              {t("rooms.modeChange.confirm")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
