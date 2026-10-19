import type { ComponentType, ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

/**
 * An item of the area sidebar (Remake: Nav item, 40 px). The active item gets
 * the sidebar-accent surface; the router sets `aria-current="page"` on it.
 */
// Figma (Remake): Nav item · https://www.figma.com/design/Oxlrm0tdW7aWH6C1rbP0fO/?node-id=21-155
type SidebarLinkProps = LinkProps & {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  children: ReactNode
}

export function SidebarLink({ icon: Icon, children, ...props }: SidebarLinkProps) {
  return (
    <Link
      {...props}
      // Active styling uses the router's data-status attribute (see NavLink).
      className="flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
    >
      <Icon
        aria-hidden
        className="size-4.5 shrink-0"
      />
      {children}
    </Link>
  )
}
