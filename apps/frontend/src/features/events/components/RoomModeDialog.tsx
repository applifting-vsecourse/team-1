import { useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { formatDateRange } from "@/lib/date"

import {
  setRoomMode,
  type RoomGender,
  type RoomMode,
  type TermRooms,
} from "@/features/events/api/rooms"

type Gender = RoomGender["gender"]

// Confirmation of a room mode change in one term. Switching to gendered rooms asks for a gender of
// every existing room, because a gendered room cannot be without one.
// Figma (Design system): X24a–c / Změna režimu pokojů
// https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13912-322
// https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13912-528
// https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13912-560
export function RoomModeDialog({
  term,
  targetMode,
  onClose,
  onSaved,
}: {
  term: TermRooms
  targetMode: RoomMode
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = useTranslation("events")
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [genders, setGenders] = useState<Record<string, Gender>>({})
  const isAssignmentNeeded = targetMode === "GENDERED" && term.rooms.length > 0
  const isAssigned = !isAssignmentNeeded || term.rooms.every((room) => genders[room.id])
  const mutation = useMutation({
    mutationFn: () =>
      setRoomMode(
        term.eventId,
        term.termId,
        targetMode,
        isAssignmentNeeded
          ? term.rooms.map((room) => ({ id: room.id, gender: genders[room.id]! }))
          : [],
      ),
    onSuccess: async () => {
      await onSaved()
      onClose()
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-170"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          cancelRef.current?.focus()
        }}
      >
        <p className="text-xs font-medium text-muted-foreground uppercase">
          {term.eventName} · {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
        </p>
        <div className="flex items-center justify-between gap-4 pr-8">
          <DialogTitle>{t("rooms.modeChange.title")}</DialogTitle>
        </div>
        <Alert className="border-status-warning bg-status-warning-bg p-6">
          <AlertTitle className="text-lg text-status-warning">
            {t(
              targetMode === "SHARED"
                ? "rooms.modeChange.sharedHeading"
                : "rooms.modeChange.genderedHeading",
            )}
          </AlertTitle>
          <AlertDescription className="text-foreground">
            {t(
              targetMode === "SHARED"
                ? "rooms.modeChange.sharedBody"
                : "rooms.modeChange.genderedBody",
            )}
          </AlertDescription>
        </Alert>
        <DialogDescription className="text-base text-foreground">
          {t(term.roomMode === "GENDERED" ? "rooms.genderedMode" : "rooms.sharedMode")} →{" "}
          {t(targetMode === "GENDERED" ? "rooms.genderedMode" : "rooms.sharedMode")}
        </DialogDescription>
        {isAssignmentNeeded ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">{t("rooms.modeChange.assignHeading")}</h3>
              <p className="text-sm text-muted-foreground">{t("rooms.modeChange.assignBody")}</p>
            </div>
            {term.rooms.map((room) => (
              <fieldset
                key={room.id}
                className="flex flex-col gap-2"
              >
                <legend className="text-sm font-medium">
                  {room.name} · {t("rooms.beds", { count: room.beds })}
                </legend>
                <RadioGroup
                  className="grid-flow-col justify-start gap-8"
                  value={genders[room.id] ?? ""}
                  onValueChange={(value) =>
                    setGenders((current) => ({ ...current, [room.id]: value as Gender }))
                  }
                  aria-label={room.name}
                  disabled={mutation.isPending}
                >
                  {(["FEMALE", "MALE"] as const).map((gender) => (
                    <div
                      key={gender}
                      className="flex items-center gap-3"
                    >
                      <RadioGroupItem
                        id={`${room.id}-${gender}`}
                        value={gender}
                      />
                      <Label htmlFor={`${room.id}-${gender}`}>
                        {t(gender === "FEMALE" ? "rooms.female" : "rooms.male")}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </fieldset>
            ))}
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">{t("rooms.modeChange.hint")}</p>
        {mutation.isError ? (
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
              {t("rooms.modeChange.cancel")}
            </Button>
          </DialogClose>
          <Button
            size="lg"
            className="sm:w-38"
            disabled={!isAssigned || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            {t("rooms.modeChange.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
