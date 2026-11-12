import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2, TriangleAlert } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDateRange } from "@/lib/date"
import { notify } from "@/lib/notify"

import { setExtraBeds, type Room, type TermRooms } from "@/features/events/api/rooms"

// Extra beds (přistýlky) of one room in one term, in a dialog over the list of rooms (approved
// improvement of the separate screen drawn in Figma: it saves and closes in place).
// Figma (Design system): Přistýlky v pokoji · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-36832 (mobile 19786-36991)
export function RoomExtraBedsDialog({
  term,
  room,
  onClose,
  onSaved,
}: {
  term: TermRooms
  room: Room
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { t } = useTranslation("events")
  const [value, setValue] = useState(room.extraBeds ? String(room.extraBeds) : "")
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: (extraBeds: number) => setExtraBeds(term.eventId, term.termId, room.id, extraBeds),
  })
  const save = async (extraBeds: number) => {
    try {
      await mutation.mutateAsync(extraBeds)
    } catch {
      return
    }
    await onSaved()
    notify.success(t("rooms.extraBedsSaved"))
    onClose()
  }
  const submit = () => {
    if (!/^\d+$/.test(value.trim()) || Number(value) < 1 || Number(value) > 2147483647) {
      setError(t("rooms.extraBedsError"))
      return
    }
    setError(null)
    void save(Number(value))
  }
  const isPending = mutation.isPending
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-card shadow-md sm:max-w-170">
        <DialogTitle>{t("rooms.extraBedsTitle")}</DialogTitle>
        <DialogDescription className="text-base">
          {t("rooms.extraBedsContext", {
            room: room.name,
            term: formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }),
          })}
        </DialogDescription>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (!isPending) submit()
          }}
        >
          <dl className="grid grid-cols-3 gap-4 text-sm">
            {[
              [t("rooms.extraBedsBaseLabel"), String(room.capacity)],
              [t("rooms.extraBedsCountLabel"), `+${room.extraBeds}`],
              [t("rooms.extraBedsTotalLabel"), String(room.beds)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col gap-1"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <fieldset
            disabled={isPending}
            className="flex flex-col gap-2"
          >
            <Label htmlFor="extra-beds">{t("rooms.extraBedsLabel")}</Label>
            <Input
              id="extra-beds"
              type="number"
              inputMode="numeric"
              step={1}
              value={value}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "extra-beds-error" : undefined}
              onChange={(event) => {
                setValue(event.target.value)
                setError(null)
              }}
            />
            {error ? (
              <p
                id="extra-beds-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
          </fieldset>
          <Alert>
            <TriangleAlert />
            <AlertTitle>{t("rooms.extraBedsNoteTitle")}</AlertTitle>
            <AlertDescription>{t("rooms.extraBedsNoteBody")}</AlertDescription>
          </Alert>
          {mutation.isError ? (
            <ErrorState
              title={t("rooms.saveFailed")}
              error={mutation.error}
            />
          ) : null}
          <DialogFooter className="gap-4">
            {room.extraBeds ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="sm:mr-auto"
                disabled={isPending}
                onClick={() => {
                  void save(0)
                }}
              >
                {t("rooms.extraBedsRemove")}
              </Button>
            ) : null}
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isPending}
              >
                {t("rooms.close")}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="lg"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="animate-spin" /> : null}
              {t("rooms.extraBedsSave")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
