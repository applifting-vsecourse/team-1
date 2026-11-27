import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { cn } from "@/lib/utils"

/**
 * Togena symbol: the arcs in the current colour (the caller passes `text-logo-symbol`: teal, mint in
 * dark mode, Figma color/logo/symbol), the dot always
 * orange (system B: the dot is „you are here“, the same mark as the active nav bar and the avatar).
 * Weight „Výrazně tučné“ (approved 2026-11-27): Figma draws it in a 40-unit box with the arc 3.4
 * and the dot r 3.84; here the same geometry is scaled to the 32-unit box (× 0.8).
 */
// Figma (Design system v2): Logo · tloušťka, Výrazně tučné · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27714-4261
export function LogoSymbol({ className, fraction }: { className?: string; fraction?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5.76 19.84V10.88A5.12 5.12 0 0 1 10.88 5.76H18.56M26.24 12.16V21.12A5.12 5.12 0 0 1 21.12 26.24H13.44"
        pathLength={fraction === undefined ? undefined : 1}
        strokeDasharray={fraction === undefined ? undefined : 1}
        strokeDashoffset={fraction === undefined ? undefined : 1 - fraction}
        stroke="currentColor"
        strokeWidth="2.72"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        data-slot="logo-dot"
        cx="16"
        cy="16"
        r="3.072"
        className="fill-brand-warm"
      />
    </svg>
  )
}

/** Symbol and the lowercase name. Sits in every header, centred on the sign-in pages. */
export function Logo({
  to = ROUTES.home,
  isSmall = false,
}: {
  to?: string
  /** The small lockup at every width (the footer); by default it grows from `md`. */
  isSmall?: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-1.5 text-lg leading-none font-semibold tracking-tight",
        !isSmall && "md:gap-2.5 md:text-3xl",
      )}
    >
      <LogoSymbol className={cn("size-6 text-logo-symbol", !isSmall && "md:size-10")} />
      <span>togena</span>
    </Link>
  )
}
