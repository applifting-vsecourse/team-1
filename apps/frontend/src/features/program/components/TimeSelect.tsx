import { useTranslation } from "react-i18next"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"))
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"))

const split = (value: string): [string, string] => {
  const [hours, minutes] = value.split(":")
  return HOURS.includes(hours ?? "") && /^[0-5]\d$/.test(minutes ?? "")
    ? [hours ?? "09", minutes ?? "00"]
    : ["09", "00"]
}

/**
 * Time as two lists, hours and minutes (every 5 minutes): nothing to type or scroll through by
 * segments. Picking an hour keeps the minutes, so a new time starts at `:00`. Extra props (id, aria-*)
 * land on the hours trigger, so a form label points at it.
 */
export function TimeSelect({
  value,
  onChange,
  ...props
}: {
  value: string
  onChange: (value: string) => void
} & Omit<React.ComponentProps<typeof SelectTrigger>, "onChange" | "value">) {
  const { t } = useTranslation("program")
  const [hours, minutes] = split(value)
  // A time saved earlier with minutes off the 5-minute grid stays selectable.
  const minuteOptions = MINUTES.includes(minutes) ? MINUTES : [...MINUTES, minutes].sort()
  return (
    <div className="flex items-center gap-2">
      <Select
        value={hours}
        onValueChange={(next) => {
          onChange(`${next}:${minutes}`)
        }}
      >
        <SelectTrigger
          {...props}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((hour) => (
            <SelectItem
              key={hour}
              value={hour}
            >
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span
        aria-hidden
        className="text-muted-foreground"
      >
        :
      </span>
      <Select
        value={minutes}
        onValueChange={(next) => {
          onChange(`${hours}:${next}`)
        }}
      >
        <SelectTrigger
          aria-label={t("minutes")}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minuteOptions.map((minute) => (
            <SelectItem
              key={minute}
              value={minute}
            >
              {minute}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
