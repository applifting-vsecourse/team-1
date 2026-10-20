import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import { ActiveCorners } from "@/components/atoms/ActiveCorners"
import { cn } from "@/lib/utils"

type NavLinkProps = LinkProps & {
  children: ReactNode
  className?: string
}

/** A tab of a section navigation (event sections). The active tab gets the selected surface and the Togena corners. */
// Figma (Design system): DS / Navigation, Kind=Tab · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11739-2903
export function NavLink({ children, className, ...props }: NavLinkProps) {
  return (
    <Link
      {...props}
      // Active styling uses the router's data-status attribute rather than
      // `activeProps`: those classes would collide with the base ones and
      // Tailwind resolves such conflicts by stylesheet order, not by class order.
      className={cn(
        "group relative flex h-11 shrink-0 items-center rounded-md px-4 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
        "data-[status=active]:bg-accent data-[status=active]:text-foreground",
        className,
      )}
    >
      {children}
      <ActiveCorners />
    </Link>
  )
}
