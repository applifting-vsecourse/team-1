import { useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CalendarClock, Clock, LogIn, LogOut, Pencil, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
import { DateField } from "@/components/molecules/DateField"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate, formatDateRange, formatTime } from "@/lib/date"
import { isIsoDate, parseTimeInput, splitDateTime } from "@/lib/date-input"
import { notify } from "@/lib/notify"
import { termLine } from "@/lib/term-label"

import {
  saveStay,
  type MyApplicationTerm,
  type Stay,
  type WriterRole,
} from "@/features/participant/api/applications"

/** What the card needs of a term: the participant's application and the organizer's one both have it. */
export type StayTerm = Pick<
  MyApplicationTerm,
  "termId" | "name" | "startsOn" | "endsOn" | "stay"
> & {
  /** `false` once the term is over: the values stay visible, nothing can be changed. */
  termEditable?: boolean
}

type Fields = {
  arrivalDate: string
  arrivalTime: string
  departureDate: string
  departureTime: string
}
type Errors = { arrival?: string; departure?: string }

const toFields = (stay: Stay): Fields => {
  const arrival = splitDateTime(stay.lateArrival ?? "")
  const departure = splitDateTime(stay.earlyDeparture ?? "")
  return {
    arrivalDate: arrival.date,
    arrivalTime: arrival.time,
    departureDate: departure.date,
    departureTime: departure.time,
  }
}

/** The wall time is shown as it was entered: `Příjezd 13. 7. 2027 v 10:30`. */
const formatWall = (label: string, wall: string, at: string) =>
  `${label} ${formatDate(wall)} ${at} ${formatTime(wall)}`

/** The arrival and departure of every term that can still take them (US-143). */
export function TermStaySection({
  applicationId,
  terms,
  writer = "participant",
}: {
  applicationId: string
  terms: StayTerm[]
  writer?: WriterRole
}) {
  const withStay = terms.filter((term) => term.stay !== undefined)
  if (withStay.length === 0) return null
  return (
    <>
      {withStay.map((term) => (
        <TermStayCard
          key={term.termId}
          applicationId={applicationId}
          term={term}
          writer={writer}
        />
      ))}
    </>
  )
}

// Figma (Design system v2): US-143 Přihlašovatel · Termín bez údajů · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24969-9124 (mobile 24969-11093)
// Figma (Design system v2): US-143 Přihlašovatel · Příjezd i odjezd uložen · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24969-10098 (mobile 24969-11807)
// Figma (Design system v2): #788 / Příjezd a odjezd, smazání vedle úpravy · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27488-124950 (360 px: node-id=27488-125121)
function TermStayCard({
  applicationId,
  term,
  writer,
}: {
  applicationId: string
  term: StayTerm
  writer: WriterRole
}) {
  const { t } = useTranslation("participant")
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view")
  const saved: Stay = term.stay ?? { lateArrival: null, earlyDeparture: null }
  const hasSaved = saved.lateArrival !== null || saved.earlyDeparture !== null
  const actionRef = useRef<HTMLButtonElement>(null)
  const headingId = `term-stay-${term.termId}`
  const isClosed = term.termEditable === false

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4"
    >
      <Card className="gap-4 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
          >
            <CalendarClock className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <h2
              id={headingId}
              className="text-2xl font-semibold tracking-tight"
            >
              {t("stay.title")}
            </h2>
            <p className="text-sm font-medium text-muted-foreground tabular-nums">
              {termLine(term)}
            </p>
          </div>
        </div>
        {hasSaved ? (
          <div className="flex flex-col gap-2 rounded-lg border bg-secondary/40 p-3">
            {saved.lateArrival ? (
              <p className="flex items-center gap-2">
                <LogIn
                  aria-hidden
                  className="size-4 shrink-0 text-primary"
                />
                {formatWall(t("stay.arrival"), saved.lateArrival, t("stay.at"))}
              </p>
            ) : null}
            {saved.earlyDeparture ? (
              <p className="flex items-center gap-2">
                <LogOut
                  aria-hidden
                  className="size-4 shrink-0 text-primary"
                />
                {formatWall(t("stay.departure"), saved.earlyDeparture, t("stay.at"))}
              </p>
            ) : null}
          </div>
        ) : null}
        {isClosed ? <p className="text-sm text-muted-foreground">{t("termClosed")}</p> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full whitespace-nowrap sm:w-auto"
            aria-label={t(hasSaved ? "stay.editLabel" : "stay.addLabel", { term: termLine(term) })}
            ref={actionRef}
            disabled={isClosed}
            onClick={() => setMode("edit")}
          >
            {hasSaved ? <Pencil aria-hidden /> : <Plus aria-hidden />}
            {t(hasSaved ? "stay.edit" : "stay.add")}
          </Button>
          {hasSaved ? (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="w-full sm:w-auto"
              disabled={isClosed}
              onClick={() => setMode("confirmDelete")}
            >
              {t("stay.delete")}
            </Button>
          ) : null}
        </div>
      </Card>
      {mode !== "view" ? (
        <StayDialog
          applicationId={applicationId}
          term={term}
          writer={writer}
          saved={saved}
          mode={mode}
          onMode={setMode}
          restoreFocus={() => actionRef.current?.focus()}
        />
      ) : null}
    </section>
  )
}

// Figma (Design system v2): US-143 Přihlašovatel · Zadání příjezdu nebo odjezdu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24969-9260 (mobile 24969-11177)
// Figma (Design system v2): US-143 Přihlašovatel · Datum mimo termín / Odjezd před příjezdem · node-id=24969-9682 / 24969-9890
// Figma (Design system v2): US-143 Přihlašovatel · Smazat údaje · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24969-10383 (mobile 24969-11988)
function StayDialog({
  applicationId,
  term,
  writer,
  saved,
  mode,
  onMode,
  restoreFocus,
}: {
  applicationId: string
  term: StayTerm
  writer: WriterRole
  saved: Stay
  mode: "edit" | "confirmDelete"
  onMode: (mode: "view" | "edit" | "confirmDelete") => void
  restoreFocus: () => void
}) {
  const { t } = useTranslation("participant")
  const client = useQueryClient()
  const [fields, setFields] = useState<Fields>(() => toFields(saved))
  const [errors, setErrors] = useState<Errors>({})
  const set = (patch: Partial<Fields>) => setFields({ ...fields, ...patch })

  const mutation = useMutation({
    mutationFn: (next: Stay) => saveStay(applicationId, term.termId, next, writer),
    onSuccess: async (_data, next) => {
      onMode("view")
      notify.success(
        t(
          next.lateArrival === null && next.earlyDeparture === null
            ? "stay.toast.deleted"
            : "stay.toast.saved",
        ),
      )
      await client.invalidateQueries({ queryKey: [writer, "applications"] })
    },
  })

  /** One value: `null` when empty, an error when only half of it is there or it is not a day and time. */
  const combine = (date: string, time: string): { value: string | null; isInvalid: boolean } => {
    if (date.trim() === "" && time.trim() === "") return { value: null, isInvalid: false }
    const parsed = parseTimeInput(time)
    return isIsoDate(date) && parsed
      ? { value: `${date}T${parsed}`, isInvalid: false }
      : { value: null, isInvalid: true }
  }

  const submit = () => {
    const arrival = combine(fields.arrivalDate, fields.arrivalTime)
    const departure = combine(fields.departureDate, fields.departureTime)
    const range = {
      range: formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }).replace(
        /\s?–\s?/,
        ` ${t("stay.and")} `,
      ),
    }
    const outside = (value: string | null) =>
      value !== null && (value.slice(0, 10) < term.startsOn || value.slice(0, 10) > term.endsOn)
    const next: Errors = {}
    if (arrival.isInvalid) next.arrival = t("stay.invalid")
    else if (outside(arrival.value)) next.arrival = t("stay.arrivalOutside", range)
    if (departure.isInvalid) next.departure = t("stay.invalid")
    else if (outside(departure.value)) next.departure = t("stay.departureOutside", range)
    if (
      !next.arrival &&
      !next.departure &&
      arrival.value &&
      departure.value &&
      departure.value <= arrival.value
    ) {
      next.departure = t("stay.departureBeforeArrival")
    }
    setErrors(next)
    if (next.arrival || next.departure) return
    mutation.mutate({ lateArrival: arrival.value, earlyDeparture: departure.value })
  }

  const subject = termLine(term)
  const close = () => {
    if (!mutation.isPending) onMode("view")
  }

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) close()
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 overflow-y-auto sm:max-w-160"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          restoreFocus()
        }}
      >
        {mode === "confirmDelete" ? (
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl">{t("stay.deleteTitle")}</DialogTitle>
              <DialogDescription className="sr-only">{subject}</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{subject}</p>
            <p>{t("stay.deleteBody")}</p>
            {mutation.error ? (
              <Alert variant="destructive">
                <AlertDescription>{mutation.error.message}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter className="flex-row gap-2">
              <Button
                variant="ghost"
                size="lg"
                className="flex-1"
                disabled={mutation.isPending}
                onClick={() => onMode("view")}
              >
                {t("stay.cancel")}
              </Button>
              <PendingButton
                isPending={mutation.isPending}
                variant="destructive"
                size="lg"
                className="flex-1"
                onClick={() => mutation.mutate({ lateArrival: null, earlyDeparture: null })}
              >
                {t("stay.deleteConfirm")}
              </PendingButton>
            </DialogFooter>
          </>
        ) : (
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl">{t("stay.title")}</DialogTitle>
              <DialogDescription className="sr-only">{subject}</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{subject}</p>
            <p className="text-sm text-muted-foreground">{t("stay.hint")}</p>
            <StayFields
              id="arrival"
              legend={t("stay.arrivalLabel")}
              date={fields.arrivalDate}
              time={fields.arrivalTime}
              error={errors.arrival}
              term={term}
              removeLabel={t("stay.removeArrival")}
              onRemove={() => set({ arrivalDate: "", arrivalTime: "" })}
              onDate={(arrivalDate) => set({ arrivalDate })}
              onTime={(arrivalTime) => set({ arrivalTime })}
            />
            <StayFields
              id="departure"
              legend={t("stay.departureLabel")}
              date={fields.departureDate}
              time={fields.departureTime}
              error={errors.departure}
              term={term}
              removeLabel={t("stay.removeDeparture")}
              onRemove={() => set({ departureDate: "", departureTime: "" })}
              onDate={(departureDate) => set({ departureDate })}
              onTime={(departureTime) => set({ departureTime })}
            />
            {mutation.error ? (
              <Alert variant="destructive">
                <AlertDescription>{mutation.error.message}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter className="flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="flex-1 sm:flex-none"
                disabled={mutation.isPending}
                onClick={close}
              >
                {t("stay.cancel")}
              </Button>
              <PendingButton
                isPending={mutation.isPending}
                type="submit"
                size="lg"
                className="flex-2 sm:flex-none"
              >
                {t("stay.save")}
              </PendingButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function StayFields({
  id,
  legend,
  date,
  time,
  error,
  term,
  removeLabel,
  onRemove,
  onDate,
  onTime,
}: {
  id: string
  legend: string
  date: string
  time: string
  error?: string
  term: StayTerm
  removeLabel: string
  onRemove: () => void
  onDate: (value: string) => void
  onTime: (value: string) => void
}) {
  const { t } = useTranslation("participant")
  const picker = useRef<HTMLInputElement>(null)
  const timeInput = useRef<HTMLInputElement>(null)
  const hasValue = date.trim() !== "" || time.trim() !== ""
  /** The browser's own time picker; without `showPicker` the field itself gets the focus. */
  const pickTime = () => {
    const native = picker.current
    if (native && typeof native.showPicker === "function") {
      native.value = parseTimeInput(time) ?? ""
      try {
        native.showPicker()
        return
      } catch {
        // not allowed here: fall through to the text field
      }
    }
    timeInput.current?.focus()
  }
  return (
    <div
      role="group"
      aria-labelledby={`${id}-legend`}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2 pb-2">
        <span
          id={`${id}-legend`}
          className="font-semibold"
        >
          {legend}
        </span>
        {hasValue ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={onRemove}
          >
            {removeLabel}
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-date`}>{t("stay.dateLabel")}</Label>
          <DateField
            id={`${id}-date`}
            value={date}
            onChange={onDate}
            min={term.startsOn}
            max={term.endsOn}
            openOn={term.startsOn}
            className="pr-9 pl-2 sm:pr-12 sm:pl-3"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-time`}>{t("stay.timeLabel")}</Label>
          <div className="relative">
            <Input
              id={`${id}-time`}
              ref={timeInput}
              inputMode="numeric"
              autoComplete="off"
              placeholder={t("stay.timePlaceholder")}
              className="pr-9 pl-2 sm:pr-12 sm:pl-3"
              value={time}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => onTime(event.target.value)}
              onBlur={() => {
                const parsed = parseTimeInput(time)
                if (parsed) onTime(parsed)
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("stay.pickTime")}
              className="absolute top-1/2 right-1 size-9 -translate-y-1/2 text-muted-foreground"
              onClick={pickTime}
            >
              <Clock className="size-5" />
            </Button>
            <input
              ref={picker}
              type="time"
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none absolute right-0 bottom-0 size-0 opacity-0"
              onChange={(event) => {
                if (event.target.value) onTime(event.target.value)
              }}
            />
          </div>
        </div>
      </div>
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-[13px] font-medium text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
