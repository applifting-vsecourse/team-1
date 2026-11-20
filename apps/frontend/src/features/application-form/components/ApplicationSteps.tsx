import { useTranslation } from "react-i18next"

import Completed from "@/assets/motion/review-check.svg?react"
import CornerEnd from "@/assets/motion/step-corner-end.svg?react"
import CornerStart from "@/assets/motion/step-corner-start.svg?react"
import { cn } from "@/lib/utils"

// Figma v2: US-23 / Průběh přihlášky, M16 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15506-941
export function ApplicationSteps({ isReview }: { isReview: boolean }) {
  const { t } = useTranslation("applicationForm")
  return (
    <div className="relative w-fit">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-[calc(50%-0.25rem)] rounded-md bg-accent motion-safe:transition-transform motion-safe:duration-400",
          isReview && "translate-x-[calc(100%+0.5rem)]",
        )}
      >
        <CornerStart className="absolute top-px left-px" />
        <CornerEnd className="absolute right-px bottom-px" />
      </span>
      <ol className="relative grid grid-cols-2 gap-2 text-sm leading-5">
        <li
          aria-current={isReview ? undefined : "step"}
          className="flex items-center justify-center gap-1 px-3 py-2.5 text-muted-foreground aria-[current=step]:font-bold aria-[current=step]:text-foreground"
        >
          {isReview && <Completed aria-hidden="true" />}
          {t("review.detailsStep")}
        </li>
        <li
          aria-current={isReview ? "step" : undefined}
          className="px-3 py-2.5 text-center text-muted-foreground aria-[current=step]:font-bold aria-[current=step]:text-foreground"
        >
          {t("review.reviewStep")}
        </li>
      </ol>
    </div>
  )
}
