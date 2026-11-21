import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/**
 * The assignment was not saved. With several terms it is one transaction, so the message says that
 * no term was changed (#540); the reason is the translated message of the error code.
 */
export function AssignmentSaveError({
  error,
  hasMoreTerms,
}: {
  error: Error
  hasMoreTerms: boolean
}) {
  const { t } = useTranslation("events")
  if (!hasMoreTerms) {
    return (
      <ErrorState
        title={t("roomAssignments.failed")}
        error={error}
      />
    )
  }
  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>{t("roomAssignments.failed")}</AlertTitle>
      <AlertDescription>
        {error.message} {t("roomAssignments.nothingSaved")}
      </AlertDescription>
    </Alert>
  )
}
