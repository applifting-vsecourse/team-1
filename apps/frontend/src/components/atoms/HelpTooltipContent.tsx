import type { ComponentProps } from "react"

import { TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Figma: Tooltip · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15270-7343
export function HelpTooltipContent({
  className,
  isLong = false,
  ...props
}: ComponentProps<typeof TooltipContent> & { isLong?: boolean }) {
  return (
    <TooltipContent
      sideOffset={6}
      className={cn(
        "max-w-(--radix-tooltip-content-available-width) bg-tooltip p-3 text-sm leading-5 text-tooltip-foreground [&_svg]:h-1.5 [&_svg]:w-3 [&_svg]:translate-y-0 [&_svg]:rotate-0 [&_svg]:rounded-none [&_svg]:bg-transparent [&_svg]:fill-tooltip",
        isLong ? "w-76" : "w-56",
        className,
      )}
      {...props}
    />
  )
}
