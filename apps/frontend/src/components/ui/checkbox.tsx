import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import check from "@/assets/forms/checkbox-check.svg"
import { cn } from "@/lib/utils"

// Figma: Togena / Forms / Checkbox · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15187-22
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer grid size-6 shrink-0 place-items-center rounded-checkbox border border-field-border bg-card outline-none focus-visible:border-2 focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-field-error data-[state=checked]:bg-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:focus-visible:outline-none",
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
