import type { ComponentType, ReactNode } from "react"
import { Link, type LinkProps } from "@tanstack/react-router"

/**
 * Figma: DS / Navigation — an item of the area sidebar. The active item gets
 * the selected surface and the Togena corners (DS / Graphic / Navigation
 * corners); they keep their radius and stroke at any item width.
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
      // Active styling uses the router's data-status attribute (see NavLink).
      className="group relative flex h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent data-[status=active]:bg-accent"
    >
      <Icon
        aria-hidden
        className="size-5 shrink-0"
      />
      {children}
      <ActiveCorners />
    </Link>
  )
}

function ActiveCorners() {
  return (
    <span
      aria-hidden="true"
      className="hidden text-primary group-data-[status=active]:block"
    >
      <svg
        viewBox="0 0 18 18"
        fill="none"
        className="absolute -top-px -left-px size-4.5"
      >
        <path
          d="M1.5 18V7.5C1.5 4.186 4.186 1.5 7.5 1.5H18"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg
        viewBox="0 0 18 18"
        fill="none"
        className="absolute -right-px -bottom-px size-4.5"
      >
        <path
          d="M0 16.5H10.5C13.814 16.5 16.5 13.814 16.5 10.5V0"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
