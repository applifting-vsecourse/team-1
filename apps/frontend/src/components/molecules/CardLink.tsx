import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Figma: Capacity metric · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12233-748
export function CardLink({
  children,
  className,
  ...props
}: LinkProps & { children: ReactNode; className?: string }) {
  return (
    <Link
      {...props}
      className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card
        className={cn(
          "relative h-full transition-colors group-hover:border-primary group-hover:bg-muted [&_[data-slot=card-content]>h3]:pr-8 [&>h2]:pr-8 [&>h3]:pr-8",
          className,
        )}
      >
        {children}
        <ChevronRight
          aria-hidden="true"
          className="absolute top-6 right-6 size-5 text-muted-foreground transition-colors group-hover:text-foreground"
        />
      </Card>
    </Link>
  )
}
