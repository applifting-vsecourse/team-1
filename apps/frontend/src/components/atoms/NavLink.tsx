import type { ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

type NavLinkProps = LinkProps & {
  children: ReactNode
  className?: string
}

/**
 * A tab of a section navigation (event sections). The active tab is the nav A marker, like the
 * sidebar item and the current stepper step: the grey `nav-active` surface, Semi Bold ink and a
 * 20 × 3 px orange underline 2 px from the bottom. No mint fill, no ActiveCorners.
 */
// Figma (Design system v2): Togena / Navigation / Tab · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15187-24
// Figma (Design system v2): F5 / Navigation / Záložky akce · Desktop · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27777-129341
export function NavLink({ children, className, ...props }: NavLinkProps) {
  return (
    <Link
      {...props}
      // Active styling uses the router's data-status attribute rather than
      // `activeProps`: those classes would collide with the base ones and
      // Tailwind resolves such conflicts by stylesheet order, not by class order.
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-control px-4 py-3 text-sm whitespace-nowrap text-foreground transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-action-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        "data-[status=active]:bg-nav-active data-[status=active]:font-semibold",
        "after:absolute after:bottom-0.5 after:left-1/2 after:hidden after:h-0.75 after:w-5 after:-translate-x-1/2 after:rounded-full after:bg-nav-indicator after:content-[''] data-[status=active]:after:block",
        className,
      )}
    >
      {children}
    </Link>
  )
}
