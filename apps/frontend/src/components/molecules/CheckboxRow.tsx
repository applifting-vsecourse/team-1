import type { ComponentProps } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

/** One checkbox with its label to the right, the same row height everywhere (forms of meals and health). */
export function CheckboxRow({
  id,
  label,
  ...props
}: Omit<ComponentProps<typeof Checkbox>, "className"> & { id: string; label: string }) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <Checkbox
        id={id}
        className="size-5"
        {...props}
      />
      <Label
        htmlFor={id}
        className="flex-1 cursor-pointer leading-5 font-normal"
      >
        {label}
      </Label>
    </div>
  )
}
