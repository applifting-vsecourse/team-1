import * as React from "react"

import { cn } from "@/lib/utils"

// Figma: Togena / Forms / Input · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15187-20
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-lg border border-field-border bg-card px-4 py-3 text-base transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
        "focus-visible:border-2 focus-visible:border-ring",
        "aria-invalid:border-2 aria-invalid:border-field-error",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
