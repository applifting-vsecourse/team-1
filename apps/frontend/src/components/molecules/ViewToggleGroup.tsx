import type { ComponentProps } from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type GroupProps = Omit<
  Extract<ComponentProps<typeof ToggleGroup>, { type: "single" }>,
  "type" | "spacing" | "variant" | "className"
>

// Brand look A (specimen, Záložka · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27538-3708):
// pills; the active view is ink-edged on the card surface, the others show a hairline on hover. No lift.
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

export function ViewToggleGroupItem(
  props: Omit<ComponentProps<typeof ToggleGroupItem>, "className">,
) {
  return (
    <ToggleGroupItem
      {...props}
      className="h-auto rounded-full border border-transparent px-3 py-2 text-sm leading-5 font-medium text-muted-foreground transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:border-border hover:bg-muted hover:text-foreground focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid data-[state=on]:border-border-strong data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:focus-visible:border-border-strong"
    />
  )
}
