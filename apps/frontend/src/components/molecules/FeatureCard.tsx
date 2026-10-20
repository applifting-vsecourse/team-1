import type { ComponentType } from "react"

import { Card } from "@/components/ui/card"

type FeatureCardProps = {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  description: string
}

/** Icon tile beside a title and a sentence — the landing's "what you can do" grid. */
// Figma (Design system): DS / Landing / Feature · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12733-2003
export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <Card className="flex-row items-start gap-4 p-6">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-link">
        <Icon
          aria-hidden
          className="size-5"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-lg leading-6.5 font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  )
}
