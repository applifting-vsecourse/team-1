import { cn } from "@/lib/utils"

/**
 * The Togena logo corners that mark the one active thing on a screen: the
 * current event card or the block being dragged in the program. Never on the
 * sidebar item, a stepper step or a tab (they have the nav A bar or underline,
 * DESIGN.md), rows, buttons, badges, hover or decoration (docs/FIGMA-REMAKE.md).
 *
 * Put it inside a `relative group` element; it shows while that element has
 * `data-status="active"` (what the router's Link sets). The corners slide in
 * from 6 px and fade in (400 ms, ease-out); reduced motion shows the final state immediately.
 */
// Figma (Design system): DS / Graphic / Active corners · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=26793-3511
export function ActiveCorners({ className }: { className?: string }) {
  const corner =
    "absolute size-4.5 opacity-0 transition-[opacity,translate] duration-400 ease-out group-data-[status=active]:translate-0 group-data-[status=active]:opacity-100 motion-reduce:translate-0 motion-reduce:transition-none"

  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 text-primary", className)}
    >
      <svg
        viewBox="0 0 18 18"
        fill="none"
        className={cn(corner, "top-0 left-0 translate-1.5")}
      >
        <path
          d="M1.5 16.5V7.5C1.5 4.186 4.186 1.5 7.5 1.5H16.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg
        viewBox="0 0 18 18"
        fill="none"
        className={cn(corner, "right-0 bottom-0 -translate-1.5")}
      >
        <path
          d="M1.5 16.5H10.5C13.814 16.5 16.5 13.814 16.5 10.5V1.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
