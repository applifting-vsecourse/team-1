import { cn } from "@/lib/utils"

/**
 * Figma: DS / Graphic / Divider — two lines meeting in a dot. Drawn in
 * `currentColor` (set it with a `text-*` token) and scaled by its width.
 */
export function BrandDivider({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 296 22.2"
      fill="none"
      className={cn("block h-auto w-full text-primary", className)}
    >
      <path
        d="M3.7 11.1H118.4M177.6 11.1H292.3"
        stroke="currentColor"
        strokeWidth="1.85"
      />
      <circle
        cx="148"
        cy="11.1"
        r="3.7"
        fill="currentColor"
      />
    </svg>
  )
}
