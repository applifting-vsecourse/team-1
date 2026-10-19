import compositionUrl from "@/assets/brand-composition.svg"
import { cn } from "@/lib/utils"

/**
 * Figma: DS / Graphic / Composition — the original Togena vector (open frame,
 * meeting point and a tinted corner). Decorative; scaled by its width with
 * the aspect ratio kept.
 */
export function BrandComposition({ className }: { className?: string }) {
  return (
    <img
      src={compositionUrl}
      alt=""
      aria-hidden="true"
      className={cn("block h-auto max-w-full", className)}
    />
  )
}
