import { useEffect, useRef, type ComponentProps } from "react"

import { SelectedLabel } from "@/components/atoms/SelectedLabel"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

type GroupProps = Omit<
  Extract<ComponentProps<typeof ToggleGroup>, { type: "single" }>,
  "type" | "spacing" | "variant" | "className"
>

// Brand look A (specimen, Záložka · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27538-3708):
// pills; the active view is the nav A marker (nav-active surface, Semi Bold ink, 20 × 3 orange underline), the others
// show a hairline on hover. No lift. Always one row: on a phone it scrolls sideways instead of wrapping.
export function ViewToggleGroup({
  className,
  ...props
}: GroupProps & {
  /** Classes of the scroll strip around the group (e.g. its share of a toolbar row). */
  className?: string
}) {
  const strip = useRef<HTMLDivElement>(null)

  // The selected view is always in sight, also when it is further right than a phone shows.
  useEffect(() => {
    const element = strip.current
    const selected = element?.querySelector<HTMLElement>('[data-state="on"]')
    if (!element || !selected || element.scrollWidth <= element.clientWidth) return
    const right = selected.offsetLeft + selected.offsetWidth
    if (selected.offsetLeft < element.scrollLeft) element.scrollLeft = selected.offsetLeft
    else if (right > element.scrollLeft + element.clientWidth) {
      element.scrollLeft = right - element.clientWidth
    }
  }, [props.value])

  return (
    // One row that scrolls sideways and never wraps (DESIGN.md, list filters on a phone); the 4 px
    // padding keeps the focus outline inside the strip.
    <div
      ref={strip}
      className={cn("-m-1 max-w-full min-w-0 overflow-x-auto p-1", className)}
    >
      <ToggleGroup
        {...props}
        type="single"
        variant="default"
        spacing={1}
        className="w-max flex-nowrap justify-start"
      />
    </div>
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
