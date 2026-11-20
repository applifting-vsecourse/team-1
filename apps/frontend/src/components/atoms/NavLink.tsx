import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import { ActiveCorners } from "@/components/atoms/ActiveCorners"
import { cn } from "@/lib/utils"

type NavLinkProps = LinkProps & {
  children: ReactNode
  className?: string
}

/** A tab of a section navigation (event sections). The active tab gets the selected surface and the Togena corners. */
// Event navigation instances (93 × 60): https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=20580-44281
// Figma (Design system): DS / Navigation, Kind=Tab · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=26759-3551
export function NavLink({ children, className, ...props }: NavLinkProps) {
  return (
    <Link
      {...props}
      // Active styling uses the router's data-status attribute rather than
      // `activeProps`: those classes would collide with the base ones and
      // Tailwind resolves such conflicts by stylesheet order, not by class order.
      className={cn(
        "group relative flex min-h-15 min-w-[93px] shrink-0 items-center justify-center rounded-control px-3 text-base whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-safe:duration-400",
        "data-[status=active]:bg-accent data-[status=active]:text-foreground",
        className,
      )}
    >
      {children}
      <ActiveCorners />
    </Link>
  )
}
