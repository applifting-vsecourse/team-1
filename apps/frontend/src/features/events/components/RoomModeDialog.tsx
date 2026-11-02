import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
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

// Change of the room mode of one term, with a before / after capacity preview. The mode is saved
// only by "Změnit režim"; Cancel changes nothing.
// Figma (Design system): Změna režimu pokojů – rozdělení kapacity existujících pokojů · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16756-17010
// Empty term · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16754-16626
export function RoomModeDialog({
  term,
  onClose,
  onSaved,
}: {
  term: TermRooms
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = useTranslation("events")
  const otherMode: RoomMode = term.roomMode === "GENDERED" ? "SHARED" : "GENDERED"
  const [target, setTarget] = useState<RoomMode>(otherMode)
  const [genders, setGenders] = useState<Record<string, Gender>>({})
  const period = formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })
  const hasRooms = term.rooms.length > 0
  const isAssignmentNeeded = target === "GENDERED" && term.roomMode === "SHARED" && hasRooms
  const isAssigned =
    !isAssignmentNeeded || term.rooms.every((room) => genders[room.id] !== undefined)
  const canSave = target !== term.roomMode && isAssigned

  const mutation = useMutation({
    mutationFn: () =>
      setRoomMode(
        term.eventId,
        term.termId,
        target,
        isAssignmentNeeded
          ? term.rooms.map((room) => ({ id: room.id, gender: genders[room.id]! }))
          : [],
      ),
    onSuccess: async () => {
      await onSaved()
      onClose()
    },
  })

  const beds = (count: number) => t("rooms.bedCount", { count })
  const describe = (mode: RoomMode, female: number, male: number, total: number) =>
    mode === "SHARED"
      ? t("rooms.modeChange.sharedBeds", { count: total })
      : t("rooms.modeChange.genderedBeds", { female, male })
  const total = term.rooms.reduce((sum, room) => sum + room.capacity, 0)
  const assigned = (gender: Gender) =>
    term.rooms
      .filter((room) => genders[room.id] === gender)
      .reduce((sum, room) => sum + room.capacity, 0)
  const before = describe(term.roomMode, term.capacity.FEMALE, term.capacity.MALE, total)
  const after = describe(
    target,
    term.roomMode === "GENDERED" ? term.capacity.FEMALE : assigned("FEMALE"),
    term.roomMode === "GENDERED" ? term.capacity.MALE : assigned("MALE"),
    total,
  )
  const modeName = (mode: RoomMode) => t(mode === "SHARED" ? "rooms.shared" : "rooms.byGender")

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] gap-6 overflow-y-auto bg-card shadow-md sm:max-w-220">
        <DialogTitle>{t("rooms.modeChange.title")}</DialogTitle>
        <div className="grid gap-6 md:grid-cols-2 md:gap-x-6">
          <div className="flex flex-col gap-6">
            <Field
              label={t("rooms.modeChange.selectedTerm")}
              value={period}
            />
            <div className="flex flex-col gap-3">
              <Label asChild>
                <span id="room-mode-new">{t("rooms.modeChange.newMode")}</span>
              </Label>
              <RadioGroup
                value={target}
                onValueChange={(value) => setTarget(value as RoomMode)}
                aria-labelledby="room-mode-new"
                disabled={mutation.isPending}
              >
                {(["SHARED", "GENDERED"] as const).map((mode) => (
                  <div
                    key={mode}
                    className="flex items-center gap-3"
                  >
                    <RadioGroupItem
                      id={`room-mode-${mode}`}
                      value={mode}
                    />
                    <Label htmlFor={`room-mode-${mode}`}>
                      {t(mode === "SHARED" ? "rooms.shared" : "rooms.byGender")}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            {isAssignmentNeeded ? (
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-semibold">{t("rooms.modeChange.assignTitle")}</h3>
                <p className="text-sm">{t("rooms.modeChange.assignHint")}</p>
                {term.rooms.map((room) => (
                  <fieldset
                    key={room.id}
                    className="flex flex-col gap-3"
                  >
                    <legend className="text-sm">
                      {room.name} · {beds(room.capacity)}
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
          </div>
          <div className="flex flex-col gap-6">
            <Field
              label={t("rooms.modeChange.currentMode")}
              value={modeName(term.roomMode)}
            />
            <div className="flex flex-col gap-4 bg-status-success-bg p-4">
              <h3 className="text-2xl font-semibold">{t("rooms.modeChange.impact")}</h3>
              <Field
                label={t("rooms.modeChange.before")}
                value={hasRooms ? before : modeName(term.roomMode)}
              />
              <Field
                label={t("rooms.modeChange.after")}
                value={
                  hasRooms
                    ? after
                    : t(target === "GENDERED" ? "rooms.modeChange.genderedRooms" : "rooms.shared")
                }
              />
              <p className="text-sm">
                {t(
                  hasRooms
                    ? isAssignmentNeeded
                      ? "rooms.modeChange.impactAssign"
                      : "rooms.modeChange.impactKept"
                    : target === "GENDERED"
                      ? "rooms.modeChange.impactEmptyGendered"
                      : "rooms.modeChange.impactEmptyShared",
                )}
              </p>
            </div>
          </div>
          {hasRooms ? null : (
            <div className="md:col-span-2">
              <Field
                label={t("rooms.modeChange.roomsAndCapacity")}
                value={`${t("rooms.roomCount", { count: 0 })} · ${beds(0)}`}
              />
            </div>
          )}
        </div>
        <p className="text-sm">
          {t(hasRooms ? "rooms.modeChange.scope" : "rooms.modeChange.scopeEmpty", { term: period })}
        </p>
        {mutation.isError ? (
          <ErrorState
            title={t("rooms.saveFailed")}
            error={mutation.error}
          />
        ) : null}
        <DialogFooter className="gap-4">
          <DialogClose asChild>
            <Button
              variant="outline"
              size="lg"
              className="sm:w-57"
              disabled={mutation.isPending}
            >
              {t("rooms.modeChange.cancel")}
            </Button>
          </DialogClose>
          <Button
            size="lg"
            className="sm:w-57"
            disabled={!canSave || mutation.isPending}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-base text-foreground">{value}</span>
    </div>
  )
}
