import { cn } from "@/lib/utils"

type StickerProps = {
  label: string
  size?: "s" | "m"
  /** −2° in the app, −8° only inside a landing illustration. */
  tilt?: "app" | "illustration"
  /** M32 plays once on mount; with reduced motion the sticker is static. */
  isAnimated?: boolean
  className?: string
}

const SIZES = {
  s: "gap-1 rounded-md px-2 py-1 text-xs [&_svg]:size-3.5",
  m: "gap-1.5 rounded-control px-3 py-1.5 text-sm [&_svg]:size-4",
}

/**
 * Milestone sticker: warm fill with ink text and check, white edge and a hard offset shadow.
 * Decorative and never a status badge — the state is always in the text next to it.
 */
// Figma (Design system): Togena / Brand / Sticker · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27359-3591
export function Sticker({
  label,
  size = "m",
  tilt = "app",
  isAnimated = false,
  className,
}: StickerProps) {
  return (
    <span
      aria-hidden
      data-size={size}
      data-animated={isAnimated || undefined}
      className={cn(
        "sticker inline-flex w-max items-center border-4 border-sticker-edge bg-brand-warm font-semibold whitespace-nowrap text-brand-warm-foreground",
        SIZES[size],
        tilt === "app" ? "-rotate-2" : "-rotate-8",
        className,
      )}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M2.667 8 6 11.333 13.333 4"
          pathLength={1}
        />
      </svg>
      {label}
    </span>
  )
}
