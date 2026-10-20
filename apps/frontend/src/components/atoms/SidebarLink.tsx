import type { ComponentType, ReactNode } from "react"
import { Link, useMatchRoute, type LinkProps } from "@tanstack/react-router"

import { ActiveCorners } from "@/components/atoms/ActiveCorners"

/**
 * An item of the area sidebar. No border; the active item gets the selected
 * surface, hover only a lighter tint. The Togena corners mark only the page
 * the item leads to: on a page below it (an event with its own tabs) the
 * item keeps the tint and the tab carries the one marker.
 */
// Figma (Design system): DS / Navigation · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11739-2903
type SidebarLinkProps = LinkProps & {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  children: ReactNode
}

export function SidebarLink({ icon: Icon, children, ...props }: SidebarLinkProps) {
  const matchRoute = useMatchRoute()
  const isCurrentPage = Boolean(matchRoute({ to: props.to, params: props.params } as never))

  return (
    <Link
      {...props}
      // Active styling uses the router's data-status attribute (see NavLink).
      className="group relative flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
    >
      <Icon
        aria-hidden
        className="size-5 shrink-0"
      />
      {children}
      <ActiveCorners className={isCurrentPage ? undefined : "[&>svg]:opacity-0!"} />
    </Link>
  )
}
