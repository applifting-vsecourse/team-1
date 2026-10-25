import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// Figma: DS / Progress · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13147-21063
export function CapacityProgress({
  confirmed,
  capacity,
  label,
  className,
}: {
  confirmed: number
  capacity: number
  label: string
  className?: string
}) {
  const value =
    capacity > 0
      ? Math.max(0, Math.min(100, (confirmed / capacity) * 100))
      : confirmed > 0
        ? 100
        : 0
  return (
    <Progress
      value={value}
      aria-label={label}
      aria-valuetext={`${confirmed} / ${capacity}`}
      className={cn(
        confirmed > capacity && "[&_[data-slot=progress-indicator]]:bg-destructive",
        className,
      )}
    />
  )
}
