import { Clock } from "lucide-react"
import { Select as SelectPrimitive } from "radix-ui"
import { useTranslation } from "react-i18next"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem } from "@/components/ui/select"

const HALF_HOURS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0")
  return hours + (index % 2 === 0 ? ":00" : ":30")
})

// Figma v2: Time field · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=15271-7309
export function TimeSelect({
  value,
  onChange,
  ...props
}: { value: string; onChange: (value: string) => void } & Omit<
  React.ComponentProps<typeof Input>,
  "onChange" | "value"
>) {
  const { t } = useTranslation("common")

  return (
    <div className="relative">
      <Input
        {...props}
        type="time"
        step={60}
        className="w-full min-w-0 pr-12 tabular-nums [&::-webkit-calendar-picker-indicator]:hidden"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <Select
        value={value}
        onValueChange={onChange}
        disabled={props.disabled}
      >
        {/* The full-width anchor aligns the menu with the field. Only the clock intercepts pointer input. */}
        <SelectPrimitive.Trigger
          aria-label={t("dateField.chooseTime")}
          className="group pointer-events-none absolute inset-0 flex w-full items-center justify-end pr-1 outline-none"
        >
          <span className="pointer-events-auto grid size-11 place-items-center rounded-control text-muted-foreground group-focus-visible:outline-2 group-focus-visible:outline-ring group-disabled:pointer-events-none group-disabled:opacity-45">
            <Clock
              aria-hidden="true"
              className="size-5"
            />
          </span>
        </SelectPrimitive.Trigger>
        <SelectContent className="max-h-50.5">
          {HALF_HOURS.map((time) => (
            <SelectItem
              key={time}
              value={time}
            >
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
