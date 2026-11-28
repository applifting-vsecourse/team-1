import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import check from "@/assets/forms/checkbox-check.svg"
import { cn } from "@/lib/utils"

// Figma: Togena / Forms / Checkbox · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15187-22
// Brand look A (specimen, Zaškrtávání · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27535-3977):
// ink edge; checked is a teal box with a white check, the edge stays ink.
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer grid size-6 shrink-0 place-items-center rounded-checkbox border border-border-strong bg-card transition-colors duration-(--duration-fast) ease-(--ease-standard) outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed disabled:bg-disabled aria-invalid:border-field-error data-[state=checked]:bg-primary disabled:data-[state=checked]:bg-disabled-foreground data-[state=indeterminate]:bg-primary disabled:data-[state=indeterminate]:bg-disabled-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="group/indicator grid place-content-center"
      >
        <img
          src={check}
          alt=""
          className="group-data-[state=indeterminate]/indicator:hidden"
        />
        <span className="hidden h-0.5 w-3 rounded-full bg-primary-foreground group-data-[state=indeterminate]/indicator:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
