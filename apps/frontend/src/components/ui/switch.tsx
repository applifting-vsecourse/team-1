import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

// Figma: Togena / Forms / Switch · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15187-23
// Brand look A (specimen, Zaškrtávání · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27535-3977):
// ink edge; off is a white track with an ink thumb, on a teal track with a white thumb; the thumb moves in 120 ms.
function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full border border-border-strong transition-colors duration-(--duration-fast) ease-(--ease-standard) outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:bg-primary disabled:data-[state=checked]:bg-disabled-foreground data-[state=unchecked]:bg-card disabled:data-[state=unchecked]:bg-disabled",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-foreground ring-0 transition-[translate,background-color] duration-(--duration-fast) ease-(--ease-standard) group-data-[size=default]/switch:size-4.5 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%+3px)] data-[state=checked]:bg-primary-foreground group-data-[size=sm]/switch:data-[state=checked]:translate-x-2.5 data-[state=unchecked]:translate-x-0.5 group-data-[size=sm]/switch:data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
