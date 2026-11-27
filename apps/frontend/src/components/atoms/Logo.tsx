import { Link } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"
import { cn } from "@/lib/utils"

/** Togena symbol (Figma DS / Brand / Togena symbol), drawn in the primary colour. */
export function LogoSymbol({ className, fraction }: { className?: string; fraction?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M6.667 18.667V10c0-2.222 1.111-3.333 3.333-3.333h6.667M25.333 13.333V22c0 2.222-1.111 3.333-3.333 3.333h-6.667"
        pathLength={fraction === undefined ? undefined : 1}
        strokeDasharray={fraction === undefined ? undefined : 1}
        strokeDashoffset={fraction === undefined ? undefined : 1 - fraction}
        stroke="currentColor"
        strokeWidth="2.667"
        strokeLinecap="round"
      />
      <circle
        cx="16"
        cy="16"
        r="2"
        fill="currentColor"
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
      <LogoSymbol className={cn("size-6 text-primary", !isSmall && "md:size-10")} />
      <span>togena</span>
    </Link>
  )
}
