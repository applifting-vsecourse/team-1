import { cn } from "@/lib/utils"

export function ImpactFigure({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <dt className="min-w-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-base font-medium whitespace-nowrap tabular-nums">{children}</dd>
    </div>
  )
}
