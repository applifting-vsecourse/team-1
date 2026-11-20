import { cn } from "@/lib/utils"

// Figma v2: compact form heading divider · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15507-914
export function BrandDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative h-6 w-full", className)}
    >
      <span className="absolute inset-x-0 bottom-px h-px bg-border" />
      <span className="absolute inset-s-0 bottom-0 h-[3px] w-12 bg-primary md:w-20" />
    </div>
  )
}
