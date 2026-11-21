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
    <div className="flex items-center gap-3 py-2">
      <Checkbox
        id={id}
        {...props}
      />
      <Label
        htmlFor={id}
        className="flex-1 cursor-pointer text-base leading-6 font-normal"
      >
        {label}
      </Label>
    </div>
  )
}
