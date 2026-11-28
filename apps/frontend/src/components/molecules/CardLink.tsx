import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Figma: Capacity metric · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12233-748
// Brand look A (specimen, Karta klikací · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27536-3708):
// the whole card lifts onto the hard ink shadow on hover and settles back when pressed.
export function CardLink({
  children,
  className,
  ...props
}: LinkProps & { children: ReactNode; className?: string }) {
  return (
    <Link
      {...props}
      className="group block lift rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid"
    >
      <Card
        className={cn(
          "relative h-full [&_[data-slot=card-content]>h3]:pr-8 [&>h2]:pr-8 [&>h3]:pr-8",
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
