import type { ComponentType, ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import { ActiveCorners } from "@/components/atoms/ActiveCorners"

/**
 * An item of the area sidebar. No border; the active item gets the selected
 * surface and the Togena corners, hover only a lighter tint. The item stays
 * marked on the pages below it too (an event and its tabs), as in the Figma
 * frames (#394).
 */
// Figma (Design system): DS / Navigation · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15219-4340
type SidebarLinkProps = LinkProps & {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  children: ReactNode
}

export function SidebarLink({ icon: Icon, children, ...props }: SidebarLinkProps) {
  return (
    <Link
      {...props}
      title={typeof children === "string" ? children : undefined}
      // Active styling uses the router's data-status attribute (see NavLink).
      className="group relative flex min-h-12 items-center gap-4 rounded-control px-3 py-2 text-base text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
    >
      <Icon
        aria-hidden
        className="size-5 shrink-0"
      />
      <span>{children}</span>
      <ActiveCorners className="group-focus-visible:hidden" />
    </Link>
  )
}
