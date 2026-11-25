import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const BAR = "animate-none skeleton-shimmer rounded-full"

// Figma (Design system v2): Katalog · načítání · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19404-4933 (mobile 19404-4979)
/** The shape of an organization with its cards while the catalog loads; the label is for screen readers only. */
export function CatalogSkeleton() {
  const { t } = useTranslation("catalog")

  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col gap-3"
    >
      <span className="sr-only">{t("list.loading")}</span>
      <div
        aria-hidden
        className="flex items-center gap-2"
      >
        <Skeleton className={`h-5 w-40 ${BAR}`} />
        <Skeleton className={`h-5 w-14 ${BAR}`} />
      </div>
      <ul
        aria-hidden
        className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-6"
      >
        {[0, 1, 2].map((card) => (
          <li key={card}>
            <Card className="gap-0 overflow-hidden p-0">
              <Skeleton className="skeleton-shimmer h-49 w-full animate-none rounded-none" />
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className={`h-5 w-3/4 ${BAR}`} />
                <Skeleton className={`h-4 w-1/2 ${BAR}`} />
                <Skeleton className={`h-4 w-1/3 ${BAR}`} />
                <Skeleton className={`h-4 w-1/2 ${BAR}`} />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}
