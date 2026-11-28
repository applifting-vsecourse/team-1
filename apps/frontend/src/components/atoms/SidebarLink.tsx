import type { ComponentType, ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

/**
 * An item of the area sidebar. No border. The active item (system B, nav A: GitHub Primer NavList,
 * IBM Carbon) gets the neutral `nav-active` surface, ink Semi Bold text and an ink icon (inactive
 * icons are text/secondary, Figma Default 15219:4312) and a 4 × 24 px
 * `nav-indicator` bar inside its left edge: the orange says „you are here“ without filling the
 * item. Hover is the quiet `action-subtle` tint (Figma bg/subtle 60 %), always weaker than active;
 * focus is the teal outline, offset so the sidebar never clips it. No ActiveCorners here.
 * The item stays marked on the pages below it too (an event and its tabs), as in the Figma frames
 * (#394).
 */
// Figma (Design system v2): Togena / Navigation / Nav item · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15219-4340
// Figma (Design system v2): Navigace · aktivní položka, specimen light/dark · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27763-190215
// Figma (Design system v2): F5 / Navigation / Položka sekce akce · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27890-4720
const SIZES = {
  // The area navigation („Akce“, „Moje přihlášky“).
  default: "min-h-12 gap-4 text-base",
  // The sections of an open event in the sidebar: twelve of them fit a laptop's height.
  compact: "min-h-10 gap-3 text-sm",
  // The same sections in the phone's bottom sheet: a 44 px touch target.
  touch: "min-h-11 gap-4 text-base",
}

type SidebarLinkProps = LinkProps & {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  size?: keyof typeof SIZES
  /** E.g. closes the bottom sheet the link sits in. */
  onClick?: () => void
  children: ReactNode
}

export function SidebarLink({
  icon: Icon,
  size = "default",
  children,
  ...props
}: SidebarLinkProps) {
  return (
    <Link
      {...props}
      title={typeof children === "string" ? children : undefined}
      // Active styling uses the router's data-status attribute.
      className={cn(
        "group relative flex items-center rounded-control px-3 py-2 text-sidebar-foreground transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-action-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[status=active]:bg-nav-active data-[status=active]:font-semibold",
        SIZES[size],
      )}
    >
      <span
        aria-hidden="true"
        data-slot="nav-indicator"
        className="absolute top-1/2 left-1 hidden h-6 w-1 -translate-y-1/2 rounded-xs bg-nav-indicator group-data-[status=active]:block"
      />
      <Icon
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground group-data-[status=active]:text-sidebar-foreground"
      />
      <span>{children}</span>
    </Link>
  )
}
