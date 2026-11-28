import type { ComponentProps } from "react"

import { SelectedLabel } from "@/components/atoms/SelectedLabel"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type GroupProps = Omit<
  Extract<ComponentProps<typeof ToggleGroup>, { type: "single" }>,
  "type" | "spacing" | "variant" | "className"
>

// Brand look A (specimen, Záložka · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27538-3708):
// pills; the active view is the nav A marker (nav-active surface, Semi Bold ink, 20 × 3 orange underline), the others
// show a hairline on hover. No lift.
export function ViewToggleGroup(props: GroupProps) {
  return (
    <ToggleGroup
      {...props}
      type="single"
      variant="default"
      spacing={1}
      className="max-w-full flex-wrap justify-start"
    />
  )
}

export function ViewToggleGroupItem({
  children,
  ...props
}: Omit<ComponentProps<typeof ToggleGroupItem>, "className">) {
  return (
    <ToggleGroupItem
      {...props}
      className="relative h-auto rounded-full border border-transparent px-4 py-3 text-sm leading-5 font-medium text-muted-foreground transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-border hover:bg-muted hover:text-foreground focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid data-[state=on]:bg-nav-active data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:after:absolute data-[state=on]:after:bottom-0.5 data-[state=on]:after:left-1/2 data-[state=on]:after:h-0.75 data-[state=on]:after:w-5 data-[state=on]:after:-translate-x-1/2 data-[state=on]:after:rounded-full data-[state=on]:after:bg-nav-indicator data-[state=on]:after:content-['']"
    >
      <SelectedLabel>{children}</SelectedLabel>
    </ToggleGroupItem>
  )
}
