import { useId, useLayoutEffect, useRef, useState, type ComponentProps } from "react"
import { cs, enGB } from "date-fns/locale"
import { MonthGrid, useDayPicker } from "react-day-picker"
import { useTranslation } from "react-i18next"

import endCorner from "@/assets/motion/calendar-end.svg"
import startCorner from "@/assets/motion/calendar-start.svg"
import { Calendar } from "@/components/ui/calendar"
import { currentLanguage } from "@/i18n"
import { formatDate, formatDateRange } from "@/lib/date"
import { isoToLocalDate, localDateToIso } from "@/lib/date-input"

type Props = {
  startsOn: string
  endsOn: string
  onChange: (start: string, end: string) => void
}

function RangeMonthGrid(props: ComponentProps<typeof MonthGrid>) {
  const { selected } = useDayPicker<{ mode: "range" }>()
  const { t } = useTranslation("events")
  return (
    <>
      <p
        className="text-sm text-primary"
        role="status"
      >
        {selected?.from &&
          (selected.to
            ? formatDateRange(selected.from, selected.to, { shouldShowYear: true })
            : t("terms.form.rangeStart", { date: formatDate(selected.from) }))}
      </p>
      <MonthGrid {...props} />
    </>
  )
}

const boundaryClass =
  "pointer-events-none absolute top-0 left-0 transition-none motion-safe:transition-[translate] motion-safe:duration-400 motion-safe:ease-[cubic-bezier(.22,.8,.2,1)]"

// Figma v2: US-13 / Přidat termín · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15409-10617
// Mobile 15409-10704. M21 moves the two boundaries while the dates change immediately.
export function TermRangeCalendar({ startsOn, endsOn, onChange }: Props) {
  const { t } = useTranslation("events")
  const id = useId()
  const from = isoToLocalDate(startsOn)
  const to = from && endsOn >= startsOn ? isoToLocalDate(endsOn) : undefined
  const startKey = from ? startsOn : ""
  const endKey = to ? endsOn : ""
  const year = new Date().getFullYear()
  const [month, setMonth] = useState(() => from ?? new Date())
  const [lastStart, setLastStart] = useState(startsOn)
  if (lastStart !== startsOn) {
    setLastStart(startsOn)
    if (from) setMonth(from)
  }

  const panel = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLImageElement>(null)
  const last = useRef<HTMLImageElement>(null)
  useLayoutEffect(() => {
    const root = panel.current
    if (!root) return
    function place(corner: HTMLImageElement | null, iso: string, isEnd: boolean) {
      if (!corner || !root) return
      const day = iso && root.querySelector<HTMLElement>(`td[data-day="${iso}"] button`)
      corner.hidden = !day
      if (!day) return
      const cell = day.getBoundingClientRect()
      const box = root.getBoundingClientRect()
      // The dialog scales as it opens. Convert the viewport measurements back to
      // local coordinates before positioning the corner inside the panel border.
      const scaleX = box.width / root.offsetWidth || 1
      const scaleY = box.height / root.offsetHeight || 1
      const x = ((isEnd ? cell.right : cell.left) - box.left) / scaleX - root.clientLeft
      const y = ((isEnd ? cell.bottom : cell.top) - box.top) / scaleY - root.clientTop
      const insetX = isEnd ? -corner.width - 2 : 2
      const insetY = isEnd ? -corner.height - 2 : 2
      corner.style.translate = `${x + insetX}px ${y + insetY}px`
    }
    const position = () => {
      place(first.current, startKey, false)
      place(last.current, endKey, true)
    }
    position()
    const observer = new ResizeObserver(position)
    observer.observe(root)
    return () => observer.disconnect()
  }, [startKey, endKey, month])

  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-2"
    >
      <h3
        id={id}
        className="text-sm font-medium"
      >
        {t("terms.form.rangeLabel")}
      </h3>
      <div
        ref={panel}
        className="relative w-full max-w-102 rounded-2xl border bg-card p-3 md:p-6"
      >
        <Calendar
          mode="range"
          required
          resetOnSelect
          selected={from ? { from, to } : undefined}
          onSelect={(range) => {
            onChange(
              range.from ? localDateToIso(range.from) : "",
              range.to ? localDateToIso(range.to) : "",
            )
          }}
          month={month}
          onMonthChange={setMonth}
          showOutsideDays={false}
          weekStartsOn={1}
          locale={currentLanguage() === "cs" ? cs : enGB}
          captionLayout="dropdown"
          startMonth={new Date(Math.min(year - 20, from?.getFullYear() ?? year), 0)}
          endMonth={
            new Date(Math.max(year + 20, to?.getFullYear() ?? from?.getFullYear() ?? year), 11)
          }
          components={{ MonthGrid: RangeMonthGrid }}
          className="relative w-full bg-transparent p-0 [--cell-size:--spacing(9)]"
          classNames={{
            week: "mt-1 flex gap-1",
            weekdays: "flex gap-1",
            month: "flex w-full flex-col gap-4",
            day: "group/day relative flex-1 text-center",
            range_start: "rounded-md bg-accent text-primary",
            range_end: "rounded-md bg-accent text-primary",
            range_middle: "rounded-md bg-muted text-primary",
            day_button:
              "h-9 min-w-0 rounded-md text-sm data-[range-start=true]:bg-accent data-[range-start=true]:text-primary data-[range-end=true]:bg-accent data-[range-end=true]:text-primary data-[range-middle=true]:bg-muted data-[range-middle=true]:text-primary",
          }}
          footer={<p className="mt-4 text-sm text-muted-foreground">{t("terms.form.rangeHint")}</p>}
        />
        <img
          ref={first}
          src={startCorner}
          alt=""
          hidden
          width="16"
          height="16"
          className={boundaryClass}
        />
        <img
          ref={last}
          src={endCorner}
          alt=""
          hidden
          width="16"
          height="16"
          className={boundaryClass}
        />
      </div>
    </section>
  )
}
