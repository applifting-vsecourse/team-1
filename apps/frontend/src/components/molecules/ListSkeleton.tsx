import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Figma v2: application list loading · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15628-3938 (mobile 15628-4034)
export function ListSkeleton({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <Card
      role="status"
      className="gap-4 p-6 shadow-none"
    >
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex items-center gap-3"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-3 w-full rounded-lg" />
          </div>
        </div>
      ))}
      <p className="text-sm text-muted-foreground">{label ?? t("state.loading")}</p>
    </Card>
  )
}
