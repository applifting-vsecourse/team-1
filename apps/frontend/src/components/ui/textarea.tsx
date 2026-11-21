import * as React from "react"

import { cn } from "@/lib/utils"

// Figma: Togena / Forms / Textarea · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15197-747
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "form-textarea field-sizing-content min-h-32 w-full rounded-lg border border-field-border bg-card p-4 text-base transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-2 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-45 aria-invalid:border-2 aria-invalid:border-field-error",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
