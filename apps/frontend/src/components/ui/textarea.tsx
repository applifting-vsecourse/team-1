import * as React from "react"

import { cn } from "@/lib/utils"

// Figma: Togena / Forms / Textarea · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15197-747
// Brand look A: the same edge, focus, error and disabled states as Input.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "form-textarea field-sizing-content min-h-32 w-full rounded-control border border-border-strong bg-card p-4 text-base transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-2 aria-invalid:border-field-error",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
