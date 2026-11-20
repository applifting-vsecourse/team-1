import type { ComponentProps } from "react"
import { Minus, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "max"> & {
  value: string
  max?: number
  onValueChange: (value: string) => void
}

// Figma v2: Togena / Forms / Number field, used by room capacities and extra beds.
// https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=15272-7299
export function RoomBedCountField({
  value,
  max,
  onValueChange,
  disabled: isDisabled = false,
  ...props
}: Props) {
  const { t } = useTranslation("events")
  const current = Number(value)
  const change = (delta: number) => {
    const next = Math.max(1, Math.trunc(current || 0) + delta)
    onValueChange(String(max === undefined ? next : Math.min(next, max)))
  }

  return (
    <div className="relative">
      <Input
        {...props}
        type="number"
        min={1}
        max={max}
        step={1}
        inputMode="numeric"
        className="[appearance:textfield] pr-26 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        disabled={isDisabled}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <div className="absolute inset-y-0 right-1 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={t("rooms.decreaseBeds")}
          disabled={isDisabled || current <= 1}
          onClick={() => change(-1)}
        >
          <Minus
            aria-hidden
            className="size-5"
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={t("rooms.increaseBeds")}
          disabled={isDisabled || (max !== undefined && current >= max)}
          onClick={() => change(1)}
        >
          <Plus
            aria-hidden
            className="size-5"
          />
        </Button>
      </div>
    </div>
  )
}
