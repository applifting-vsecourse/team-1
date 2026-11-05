import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

// Figma (Design system): US-104 Přihlášky · Lůžko už bylo obsazeno · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15780-5974 (mobile 15780-6041)
export function SubstituteTaken({
  name,
  range,
  beds,
  onRefresh,
}: {
  name: string
  range: string
  /** The free beds line: none are left. */
  beds: string
  onRefresh: () => void
}) {
  const { t } = useTranslation("eventOverview")
  return (
    <div className="flex flex-col gap-4">
      <p>
        {range} · {beds}
      </p>
      <Alert variant="destructive">
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>{t("substitutes.taken")}</AlertTitle>
        <AlertDescription>{t("substitutes.takenHint", { name })}</AlertDescription>
      </Alert>
      <Button
        size="lg"
        className="h-12 w-full"
        onClick={onRefresh}
      >
        {t("substitutes.refresh")}
      </Button>
    </div>
  )
}
