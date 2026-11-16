import { useState, type ChangeEvent, type ComponentProps } from "react"
import { format } from "date-fns"
import { cs, enGB } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DropdownProps } from "react-day-picker"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { currentLanguage } from "@/i18n"
import {
  formatDateInput,
  formatDateTimeInput,
  isIsoDate,
  isIsoDateTime,
  isoToLocalDate,
  localDateToIso,
  parseDateInput,
  parseDateTimeInput,
  parseTimeInput,
  splitDateTime,
} from "@/lib/date-input"
import { cn } from "@/lib/utils"

const DATE_FNS_LOCALES = { cs, en: enGB }
/** Years offered by the calendar when the field has no `min` / `max`. */
const DEFAULT_YEAR_SPAN = 20

type DateFieldProps = Omit<
  ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "min" | "max"
> & {
  /** `yyyy-MM-dd`, or `""`. While the typed text is not a day, the typed text itself. */
  value: string
  onChange: (value: string) => void
  /** Earliest / latest day that can be picked, `yyyy-MM-dd`. */
  min?: string
  max?: string
  /**
   * Also asks for a time of day: the value is `yyyy-MM-ddTHH:mm` and the calendar gets a time
   * field. Off by default — a day-only field looks and works as before.
   */
  hasTime?: boolean
  /** The day the calendar opens on while nothing is picked, `yyyy-MM-dd` (e.g. the start of a term). */
  openOn?: string
}

/** The time a day gets when it is picked in the calendar before any time was given. */
const DEFAULT_TIME = "08:00"

const MonthsDropdown = (props: DropdownProps) => (
  <CalendarDropdown
    {...props}
    kind="month"
  />
)
const YearsDropdown = (props: DropdownProps) => (
  <CalendarDropdown
    {...props}
    kind="year"
  />
)

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1)

const toDisplay = (value: string, language: "cs" | "en", hasTime: boolean) => {
  if (hasTime) return isIsoDateTime(value) ? formatDateTimeInput(value, language) : value
  return isIsoDate(value) ? formatDateInput(value, language) : value
}

/** Month / year picker in the calendar header: the kit Select behind DayPicker's dropdown slot. */
// Figma (Design system): DS / Date picker · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14790-1710
function CalendarDropdown({
  options,
  value,
  onChange,
  "aria-label": label,
  kind,
}: DropdownProps & { kind: "month" | "year" }) {
  return (
    <Select
      value={String(value)}
      onValueChange={(next) =>
        onChange?.({ target: { value: next } } as unknown as ChangeEvent<HTMLSelectElement>)
      }
    >
      <SelectTrigger
        aria-label={label}
        className={cn(kind === "month" ? "min-w-0 flex-1" : "w-26")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {options?.map((option) => (
          <SelectItem
            key={option.value}
            value={String(option.value)}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * A date as text with a calendar behind an icon. The format follows the app
 * language (cs `D. M. RRRR`, en `DD/MM/YYYY`), not the browser's; the value
 * given to the form stays `yyyy-MM-dd`. Typed text that is not a day is passed
 * on as it is, so the form can show an error and the text stays in the field.
 * Built to sit in a `FormControl`: the rest of the props go to the input.
 */
// Figma (Design system): DS / Date field · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=14790-1698
export function DateField({
  value,
  onChange,
  min,
  max,
  hasTime = false,
  openOn,
  onBlur,
  className,
  ...inputProps
}: DateFieldProps) {
  const { t } = useTranslation("common")
  const language = currentLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const parse = hasTime ? parseDateTimeInput : parseDateInput
  const show = (iso: string) =>
    hasTime ? formatDateTimeInput(iso, language) : formatDateInput(iso, language)
  const [text, setText] = useState(() => toDisplay(value, language, hasTime))
  const [timeText, setTimeText] = useState("")
  const [seen, setSeen] = useState({ value, language })

  // The form changed the value (reset, other language): show it, unless it is
  // what was just typed.
  if (seen.value !== value || seen.language !== language) {
    setSeen({ value, language })
    if (seen.language !== language || (parse(text) ?? text) !== value) {
      setText(toDisplay(value, language, hasTime))
    }
  }

  const { date: day, time } = hasTime ? splitDateTime(value) : { date: value, time: "" }
  const selected = isoToLocalDate(day)
  const minDate = min ? isoToLocalDate(min) : undefined
  const maxDate = max ? isoToLocalDate(max) : undefined
  const today = new Date()
  const thisYear = today.getFullYear()
  const firstYear = Math.min(
    minDate?.getFullYear() ?? thisYear - DEFAULT_YEAR_SPAN,
    selected?.getFullYear() ?? thisYear,
  )
  const lastYear = Math.max(
    maxDate?.getFullYear() ?? thisYear + DEFAULT_YEAR_SPAN,
    selected?.getFullYear() ?? thisYear,
  )
  const opensOn =
    selected ??
    (openOn ? isoToLocalDate(openOn) : undefined) ??
    (maxDate && today > maxDate ? maxDate : minDate && today < minDate ? minDate : today)

  const handleTyped = (typed: string) => {
    setText(typed)
    onChange(parse(typed) ?? typed.trim())
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(isNext) => {
        setIsOpen(isNext)
        if (isNext) setTimeText(time)
      }}
    >
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={t(hasTime ? "dateField.placeholderTime" : "dateField.placeholder")}
            className={cn("pr-12", className)}
            {...inputProps}
            value={text}
            onChange={(event) => handleTyped(event.target.value)}
            onBlur={(event) => {
              const iso = parse(text)
              if (iso) setText(show(iso))
              onBlur?.(event)
            }}
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={inputProps.disabled}
              aria-label={t("dateField.openCalendar")}
              className="absolute top-1/2 right-1 size-9 -translate-y-1/2 text-muted-foreground"
            >
              <CalendarIcon className="size-5" />
            </Button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="w-auto rounded-lg p-0"
      >
        {/* key: the calendar starts on the selected month each time it opens */}
        <Calendar
          key={`${isOpen}`}
          mode="single"
          required
          selected={selected}
          onSelect={(date) => {
            const iso = localDateToIso(date)
            if (!hasTime) {
              setText(formatDateInput(iso, language))
              onChange(iso)
              setIsOpen(false)
              return
            }
            // The time stays while the day changes; a first pick brings the default time.
            const picked = `${iso}T${time || DEFAULT_TIME}`
            setTimeText(time || DEFAULT_TIME)
            setText(show(picked))
            onChange(picked)
          }}
          defaultMonth={opensOn}
          startMonth={new Date(firstYear, 0, 1)}
          endMonth={new Date(lastYear, 11, 1)}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          captionLayout="dropdown"
          hideNavigation
          weekStartsOn={1}
          locale={DATE_FNS_LOCALES[language]}
          labels={{
            labelMonthDropdown: () => t("dateField.month"),
            labelYearDropdown: () => t("dateField.year"),
          }}
          formatters={{
            formatMonthDropdown: (date) =>
              format(date, "LLLL", { locale: DATE_FNS_LOCALES[language] }),
            // Po Út St … in Czech (date-fns gives them lowercase)
            formatWeekdayName: (date) =>
              capitalize(format(date, "EEEEEE", { locale: DATE_FNS_LOCALES[language] })),
          }}
          className="[--cell-size:--spacing(10)]"
          classNames={{ month: "flex w-full flex-col gap-2" }}
          components={{ MonthsDropdown, YearsDropdown }}
        />
        {hasTime ? (
          <div className="flex items-end gap-3 border-t p-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor={`${inputProps.id ?? "date"}-time`}>{t("dateField.time")}</Label>
              <Input
                id={`${inputProps.id ?? "date"}-time`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t("dateField.timePlaceholder")}
                disabled={!selected}
                value={timeText}
                onChange={(event) => {
                  setTimeText(event.target.value)
                  const parsed = parseTimeInput(event.target.value)
                  if (!selected) return
                  // A time that is not one goes on as text, so the form rejects it instead of
                  // keeping the last valid value the user no longer sees.
                  const next = `${day}T${parsed ?? event.target.value.trim()}`
                  setText(
                    parsed
                      ? show(next)
                      : `${formatDateInput(day, language)} ${event.target.value.trim()}`,
                  )
                  onChange(next)
                }}
                onBlur={() => {
                  const parsed = parseTimeInput(timeText)
                  if (parsed) setTimeText(parsed)
                }}
              />
            </div>
            <Button
              type="button"
              disabled={parseTimeInput(timeText) === null}
              onClick={() => setIsOpen(false)}
            >
              {t("dateField.done")}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
