import type { ComponentType, ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import { ActiveCorners } from "@/components/atoms/ActiveCorners"

/**
 * An item of the area sidebar. No border; the active item gets the selected
 * surface and the Togena corners, hover only a lighter tint. The item stays
 * marked on the pages below it too (an event and its tabs), as in the Figma
 * frames (#394).
 */
// Figma (Design system): DS / Navigation · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11739-2903
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
      className="group relative flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
    >
      <Icon
        aria-hidden
        className="size-5 shrink-0"
      />
      <span className="group-data-[collapsed=true]/sidebar:sr-only">{children}</span>
      <ActiveCorners />
    </Link>
  )
}
