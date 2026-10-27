import { Link, useRouter } from "@tanstack/react-router"

import { ROUTES } from "@/app/routes"

/** Togena symbol (Figma DS / Brand / Togena symbol), drawn in the primary colour. */
function LogoSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M6.667 18.667V10c0-2.222 1.111-3.333 3.333-3.333h6.667M25.333 13.333V22c0 2.222-1.111 3.333-3.333 3.333h-6.667"
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

/**
 * Symbol and the lowercase name. Sits in every header, centred on the sign-in pages.
 * Outside a router (the top-level error page) it falls back to a plain link.
 */
export function Logo({ isCompact = false }: { isCompact?: boolean }) {
  const hasRouter = Boolean(useRouter({ warn: false }))
  const className =
    "flex items-center gap-2 text-lg font-semibold tracking-tight md:gap-3 md:text-2xl"
  const content = (
    <>
      <LogoSymbol className="size-8 text-primary" />
      <span className={isCompact ? "sr-only" : undefined}>togena</span>
    </>
  )

  if (!hasRouter) {
    return (
      <a
        href={ROUTES.home}
        className={className}
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      to={ROUTES.home}
      className={className}
    >
      {content}
    </Link>
  )
}
