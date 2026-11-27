import { useLayoutEffect, useRef, useState } from "react"
import {
  addMonths,
  clamp,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfMonth,
} from "date-fns"
import { cs, enGB } from "date-fns/locale"
import { DayButton, type PropsRangeRequired, type PropsSingleRequired } from "react-day-picker"
import { useTranslation } from "react-i18next"

import chevron from "@/assets/calendar/chevron.svg"
import endCorner from "@/assets/calendar/end.svg"
import startCorner from "@/assets/calendar/start.svg"
import { BackButton } from "@/components/atoms/BackLink"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { currentLanguage, INTL_LOCALES } from "@/i18n"
import { formatDateRange } from "@/lib/date"
import { localDateToIso } from "@/lib/date-input"
import { cn } from "@/lib/utils"

type Props = (PropsRangeRequired | PropsSingleRequired) & {
  month: Date
  onMonthChange: (month: Date) => void
  startMonth: Date
  endMonth: Date
  isDisabled?: boolean
  min?: Date
  max?: Date
}
type View = "days" | "months" | "years"

const periods = Array.from({ length: 12 }, (_, i) => i)
const cornerClass =
  "pointer-events-none absolute top-0 left-0 motion-safe:transition-[translate] motion-safe:duration-400 motion-safe:ease-[cubic-bezier(.22,.8,.2,1)]"
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1)

// Figma v2: Calendar, Calendar day and Calendar period item · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15207-1975
export function DateCalendar({
  month,
  onMonthChange,
  startMonth,
  endMonth,
  min,
  max,
  isDisabled = false,
  ...selection
}: Props) {
  const { t } = useTranslation("common")
  const language = currentLanguage()
  const locale = language === "cs" ? cs : enGB
  const [view, setView] = useState<View>("days")
  const root = useRef<HTMLFieldSetElement>(null)
  const first = useRef<HTMLImageElement>(null)
  const last = useRef<HTMLImageElement>(null)
  const header = useRef<HTMLButtonElement>(null)
  const priorView = useRef(view)
  const from = selection.mode === "range" ? selection.selected?.from : selection.selected
  const to = selection.mode === "range" ? selection.selected?.to : selection.selected
  const startKey = from && localDateToIso(from)
  const endKey = to && localDateToIso(to)
  const year = month.getFullYear()
  const block = 2020 + Math.floor((year - 2020) / 12) * 12
  const earliest = startOfMonth(startMonth)
  const latest = startOfMonth(endMonth)
  const navigate = (date: Date) =>
    onMonthChange(clamp(startOfMonth(date), { start: earliest, end: latest }))
  const step = view === "days" ? 1 : view === "months" ? 12 : 144
  const canBack =
    view === "days"
      ? startOfMonth(month) > earliest
      : (view === "years" ? block : year) > earliest.getFullYear()
  const canForward =
    view === "days"
      ? startOfMonth(month) < latest
      : (view === "years" ? block + 11 : year) < latest.getFullYear()
  const title =
    view === "days"
      ? capitalize(format(month, "LLLL yyyy", { locale }))
      : view === "months"
        ? String(year)
        : `${block}–${block + 11}`
  const formatSelection = (start: Date, end?: Date) => {
    if (!end || isSameDay(start, end)) return formatter.format(start)
    if (language === "en") return formatDateRange(start, end, { shouldShowYear: true, language })
    const firstDay = isSameMonth(start, end)
      ? "d."
      : isSameYear(start, end)
        ? "d. MMMM"
        : "d. MMMM yyyy"
    const separator = isSameMonth(start, end) ? "–" : " – "
    return format(start, firstDay, { locale }) + separator + format(end, "d. MMMM yyyy", { locale })
  }
  const formatter = new Intl.DateTimeFormat(INTL_LOCALES[language], { dateStyle: "long" })
  const isSelecting = Boolean(from) && !to
  const isRange = selection.mode === "range"
  const status = from
    ? isSelecting
      ? t("calendar.selectEnd", {
          date: format(from, language === "cs" ? "d. MMMM" : "d MMMM", { locale }),
        })
      : formatSelection(from, to)
    : t(isRange ? "calendar.emptyRange" : "calendar.emptyDay")
  const hint = isSelecting
    ? "calendar.lastDay"
    : from
      ? "calendar.boundaries"
      : isRange
        ? "calendar.saveRange"
        : "calendar.chooseDay"

  useLayoutEffect(() => {
    if (priorView.current !== view) {
      priorView.current = view
      const target =
        view === "days"
          ? header.current
          : root.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      target?.focus({ preventScroll: true })
    }
  }, [view])

  useLayoutEffect(() => {
    const panel = root.current
    if (!panel || view !== "days") return
    function place() {
      if (!panel) return
      const box = panel.getBoundingClientRect()
      const scaleX = box.width / panel.offsetWidth || 1
      const scaleY = box.height / panel.offsetHeight || 1
      for (const [corner, key, isEnd] of [
        [first.current, startKey, false],
        [last.current, endKey, true],
      ] as const) {
        if (!corner) continue
        const day = key && panel.querySelector(`td[data-day="${key}"] button`)
        corner.hidden = !day
        if (!day) continue
        const cell = day.getBoundingClientRect()
        const x = ((isEnd ? cell.right : cell.left) - box.left) / scaleX - panel.clientLeft
        const y = ((isEnd ? cell.bottom : cell.top) - box.top) / scaleY - panel.clientTop
        corner.style.translate = `${isEnd ? x - corner.width : x}px ${isEnd ? y - corner.height : y}px`
      }
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(panel)
    return () => observer.disconnect()
  }, [startKey, endKey, month, view])

  function navigationButton(direction: -1 | 1) {
    const label = t(`calendar.${view}.${direction < 0 ? "previous" : "next"}`)
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        disabled={direction < 0 ? !canBack : !canForward}
        onClick={() => navigate(addMonths(month, direction * step))}
        className="size-11"
      >
        <img
          src={chevron}
          alt=""
          width={20}
          height={20}
          className={direction < 0 ? "rotate-90" : "-rotate-90"}
        />
      </Button>
    )
  }
  return (
    <fieldset
      disabled={isDisabled}
      ref={root}
      data-slot="date-calendar"
      className="relative flex w-81 max-w-full min-w-0 flex-col gap-4 rounded-2xl border border-border-strong bg-card p-6 text-card-foreground disabled:opacity-45 md:w-102 nested:border-border"
    >
      <div className="flex items-center gap-2">
        {navigationButton(-1)}
        {view === "years" ? (
          <span
            aria-live="polite"
            className="flex-1 text-center"
          >
            {title}
          </span>
        ) : (
          <Button
            ref={header}
            variant="ghost"
            type="button"
            onClick={() => setView(view === "days" ? "months" : "years")}
            className="h-11 min-w-0 flex-1 gap-1 p-0 text-base font-normal"
          >
            <span className="flex-1">{title}</span>
            <img
              src={chevron}
              alt=""
              width={24}
              height={24}
            />
          </Button>
        )}
        {navigationButton(1)}
      </div>
      {view === "days" ? (
        <>
          <p
            role="status"
            className="text-sm text-[var(--calendar-ink)]"
          >
            {status}
          </p>
          <Calendar
            {...selection}
            className="bg-transparent p-0"
            components={{ DayButton }}
            month={month}
            onMonthChange={navigate}
            startMonth={earliest}
            endMonth={latest}
            disabled={[...(min ? [{ before: min }] : []), ...(max ? [{ after: max }] : [])]}
            hideNavigation
            showOutsideDays={false}
            weekStartsOn={1}
            locale={locale}
            formatters={{
              formatWeekdayName: (date) => capitalize(format(date, "EEEEEE", { locale })),
            }}
            classNames={{
              root: "w-[calc(100%+2px)]",
              month: "w-full",
              months: "w-full",
              range_start: "",
              range_end: "",
              disabled: "",
              month_caption: "sr-only",
              month_grid: "block w-full [&>thead]:block",
              weekdays: "mb-4 grid grid-cols-7 gap-1",
              weekday: "text-center text-sm font-normal text-muted-foreground",
              weeks: "grid gap-1",
              week: "grid grid-cols-7 gap-1",
              day: "relative h-9 min-w-0",
              day_button: "calendar-day relative h-9 w-full rounded-checkbox text-sm font-normal",
              hidden: "invisible",
              today: "calendar-today",
              selected: "calendar-selected",
              range_middle: "calendar-middle",
            }}
          />
          <p className="text-sm text-muted-foreground">{t(hint)}</p>
          <img
            ref={first}
            src={startCorner}
            width={16}
            height={16}
            alt=""
            className={cornerClass}
            hidden
          />
          <img
            ref={last}
            src={endCorner}
            width={16}
            height={16}
            alt=""
            className={cornerClass}
            hidden
          />
        </>
      ) : (
        <>
          <div
            className="grid grid-cols-3 gap-2"
            role="group"
            aria-label={t(view === "months" ? "dateField.month" : "dateField.year")}
          >
            {periods.map((i) => {
              const date =
                view === "months" ? new Date(year, i, 1) : new Date(block + i, month.getMonth(), 1)
              const isSelected = view === "months" ? i === month.getMonth() : block + i === year
              const isDisabled =
                view === "months"
                  ? date < earliest || date > latest
                  : block + i < earliest.getFullYear() || block + i > latest.getFullYear()
              return (
                <Button
                  key={i}
                  type="button"
                  variant="ghost"
                  aria-pressed={isSelected}
                  disabled={isDisabled}
                  className={cn(
                    "calendar-period relative h-11 min-w-0 px-0 font-normal",
                    isSelected && "bg-accent text-primary",
                  )}
                  onClick={() => {
                    navigate(date)
                    setView(view === "years" ? "months" : "days")
                  }}
                >
                  {view === "months" ? capitalize(format(date, "LLLL", { locale })) : block + i}
                  {isSelected && (
                    <>
                      <img
                        src={startCorner}
                        width={16}
                        height={16}
                        alt=""
                        className="absolute top-0.5 left-0.5"
                      />
                      <img
                        src={endCorner}
                        width={16}
                        height={16}
                        alt=""
                        className="absolute right-0.5 bottom-0.5"
                      />
                    </>
                  )}
                </Button>
              )
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            {t(view === "months" ? "calendar.monthHint" : "calendar.yearHint")}
          </p>
          <BackButton onClick={() => setView("days")}>{t("calendar.back")}</BackButton>
        </>
      )}
    </fieldset>
  )
}
