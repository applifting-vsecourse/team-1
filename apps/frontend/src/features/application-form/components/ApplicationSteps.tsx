import { useTranslation } from "react-i18next"

import Completed from "@/assets/motion/review-check.svg?react"
import { cn } from "@/lib/utils"

/**
 * The two steps of the form. The current one is the stepper kit's current step (nav A, as in
 * EventSetup): the grey `nav-active` surface, ink Semi Bold and a 20 × 3 px orange underline;
 * no mint, no corners. The surface slides to the review step.
 */
// Figma v2: US-23 / Průběh přihlášky, M16 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15506-941
// Figma (Design system v2): Togena / Stepper · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15207-1976
export function ApplicationSteps({ isReview }: { isReview: boolean }) {
  const { t } = useTranslation("applicationForm")
  return (
    <div className="relative w-fit">
      <span
        aria-hidden="true"
        data-slot="step-current"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-[calc(50%-0.25rem)] rounded-md bg-nav-active motion-safe:transition-transform motion-safe:duration-400",
          isReview && "translate-x-[calc(100%+0.5rem)]",
        )}
      >
        <span
          data-slot="step-indicator"
          className="absolute bottom-1 left-3 h-0.75 w-5 rounded-full bg-nav-indicator"
        />
      </span>
      <ol className="relative grid grid-cols-2 gap-2 text-sm leading-5">
        <li
          aria-current={isReview ? undefined : "step"}
          className="flex items-center justify-center gap-1 px-3 py-2.5 text-muted-foreground aria-[current=step]:font-semibold aria-[current=step]:text-foreground"
        >
          {isReview && <Completed aria-hidden="true" />}
          {t("review.detailsStep")}
        </li>
        <li
          aria-current={isReview ? "step" : undefined}
          className="px-3 py-2.5 text-center text-muted-foreground aria-[current=step]:font-semibold aria-[current=step]:text-foreground"
        >
          {t("review.reviewStep")}
        </li>
      </ol>
    </div>
  )
}
