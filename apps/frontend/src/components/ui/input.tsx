import * as React from "react"

import { cn } from "@/lib/utils"

// Figma: Togena / Forms / Input · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15187-20
// Brand look A (specimen, Pole · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27535-3919):
// ink edge, teal focus outline 2 px off the field, 2 px error edge, flat grey when disabled; no lift.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-control border border-border-strong bg-card px-4 py-3 text-base transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
        "aria-invalid:border-2 aria-invalid:border-field-error",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
