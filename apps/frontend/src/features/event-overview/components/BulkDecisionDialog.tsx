import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { Button } from "@/components/ui/button"

import type { ListedApplication } from "@/features/event-overview/api/applications"
import { decideSelected, type BulkDecision } from "@/features/event-overview/api/bulkDecision"
import {
  BulkActionDialog,
  BulkDetail,
  BulkNames,
} from "@/features/event-overview/components/BulkActionDialog"

// Figma (Design system): US-108 Přihlášky · Dialog: Potvrdit zařazení mezi náhradníky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15823-6513 (mobile 15823-6579)
// Figma (Design system): US-108 Přihlášky · Dialog: Potvrdit zamítnutí · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15823-6743 (mobile 15823-6805)
export function BulkDecisionDialog({
  eventId,
  termId,
  decision,
  applications,
  onClose,
  onDone,
}: {
  eventId: string
  termId: string
  decision: BulkDecision
  applications: ListedApplication[]
  onClose: () => void
  onDone: (result: { changed: number; unchanged: number }) => void
}) {
  const { t } = useTranslation("eventOverview")
  const isReject = decision === "REJECT"
  const prefix = isReject ? "reject" : "waitlist"
  const decide = useMutation({
    mutationFn: () =>
      decideSelected(
        eventId,
        termId,
        decision,
        applications.map((application) => application.id),
      ),
    onSuccess: (result) =>
      onDone({ changed: result.changed.length, unchanged: result.unchanged.length }),
  })
  return (
    <BulkActionDialog
      title={t(`bulkDecision.${prefix}Title`)}
      isBusy={decide.isPending}
      onClose={onClose}
      submit={
        <Button
          variant={isReject ? "destructive" : "default"}
          size="lg"
          className="h-12 md:min-w-40"
          disabled={decide.isPending}
          onClick={() => decide.mutate()}
        >
          {t(`bulkDecision.${prefix}Submit`)}
        </Button>
      }
    >
      <>
        <BulkDetail
          label={t("bulk.selected")}
          value={t("bulk.selectedApplications", { count: applications.length })}
        />
        <BulkDetail
          label={t(`bulkDecision.${prefix}Names`)}
          value={
            <BulkNames
              names={applications.map(
                (application) => `${application.firstName} ${application.lastName}`,
              )}
            />
          }
        />
        <p className="text-sm text-muted-foreground">{t(`bulkDecision.${prefix}Scope`)}</p>
      </>
      {decide.error && (
        <ErrorState
          title={t(`bulkDecision.${prefix}Title`)}
          error={decide.error}
        />
      )}
    </BulkActionDialog>
  )
}
