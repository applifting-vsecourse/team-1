import { cn } from "@/lib/utils"

/**
 * The slanted accent band under the head of a public page — the same one that closes the landing
 * hero, so the catalog and the sign-in pages read as one site. Decorative; put it first inside a
 * `relative overflow-hidden` section.
 */
export function BandBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-x-0 bottom-0 h-32 border-t-4 border-primary bg-accent [clip-path:polygon(0_70%,100%_0,100%_100%,0_100%)] lg:h-40",
        className,
      )}
    />
  )
}
