import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { DateCalendar } from "@/components/atoms/DateCalendar"
import { isoToLocalDate, localDateToIso } from "@/lib/date-input"

type Props = {
  isDisabled?: boolean
  startsOn: string
  endsOn: string
  onChange: (start: string, end: string) => void
}

// Figma v2: US-13 / Přidat termín · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15409-10617
// Mobile 15409-10704. M21 moves the two boundaries while the dates change immediately.
export function TermRangeCalendar({ startsOn, endsOn, onChange, isDisabled }: Props) {
  const { t } = useTranslation("events")
  const id = useId()
  const from = isoToLocalDate(startsOn)
  const to = from && endsOn >= startsOn ? isoToLocalDate(endsOn) : undefined
  const year = new Date().getFullYear()
  const [month, setMonth] = useState(() => from ?? new Date())
  const [lastStart, setLastStart] = useState(startsOn)
  if (lastStart !== startsOn) {
    setLastStart(startsOn)
    if (from) setMonth(from)
  }

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
      <DateCalendar
        isDisabled={isDisabled}
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
        startMonth={new Date(Math.min(year - 20, from?.getFullYear() ?? year), 0)}
        endMonth={
          new Date(Math.max(year + 20, to?.getFullYear() ?? from?.getFullYear() ?? year), 11)
        }
      />
    </section>
  )
}
