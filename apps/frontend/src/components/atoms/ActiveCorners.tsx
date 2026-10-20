import { cn } from "@/lib/utils"

/**
 * The Togena logo corners that mark the one active thing on a screen: the
 * active sidebar item, tab or stepper step, or the current event card. Never
 * on rows, buttons, badges, hover or decoration (docs/FIGMA-REMAKE.md).
 *
 * Put it inside a `relative group` element; it shows while that element has
 * `data-status="active"` (what the router's Link sets). The corners slide in
 * from 6 px and fade in (180 ms, ease-out); with reduced motion they only fade.
 */
// Figma (Design system): DS / Graphic / Active corners · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=13134-19498
export function ActiveCorners({ className }: { className?: string }) {
  const corner =
    "absolute size-4.5 opacity-0 transition-[opacity,translate] duration-180 ease-out group-data-[status=active]:translate-0 group-data-[status=active]:opacity-100 motion-reduce:translate-0"

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
        className={cn(corner, "right-0 bottom-0 -translate-1.5")}
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
