import type { ComponentProps } from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type GroupProps = Omit<
  Extract<ComponentProps<typeof ToggleGroup>, { type: "single" }>,
  "type" | "spacing" | "variant" | "className"
>

export function ViewToggleGroup(props: GroupProps) {
  return (
    <ToggleGroup
      {...props}
      type="single"
      variant="default"
      className="max-w-full flex-wrap justify-start rounded-none border-b border-border"
    />
  )
}

export function ViewToggleGroupItem(
  props: Omit<ComponentProps<typeof ToggleGroupItem>, "className">,
) {
  return (
    <ToggleGroupItem
      {...props}
      className="relative -mb-px h-auto rounded-none border-0 px-3 py-2 text-sm leading-5 font-medium after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 hover:bg-wash hover:text-foreground data-[spacing=0]:first:rounded-l-none data-[spacing=0]:last:rounded-r-none data-[state=on]:bg-transparent data-[state=on]:text-link data-[state=on]:after:bg-primary"
    />
  )
}
