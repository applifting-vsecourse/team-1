import type { ComponentType } from "react"

import { Card } from "@/components/ui/card"

type FeatureCardProps = {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  description: string
}

/** Icon tile, title and a sentence — the landing's "what you can do" grid. */
// Figma (Remake): Feature card · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=9-11
export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <Card className="gap-4 p-6">
      <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon
          aria-hidden
          className="size-5"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  )
}
