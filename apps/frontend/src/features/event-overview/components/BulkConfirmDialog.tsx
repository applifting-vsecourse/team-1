import { useMutation, useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { ListedApplication } from "@/features/event-overview/api/applications"
import {
  bulkConfirmationPreviewQueryOptions,
  confirmSelected,
  type BulkConfirmationPreview,
} from "@/features/event-overview/api/bulkConfirmation"
import {
  BulkActionDialog,
  BulkDetail,
  BulkNames,
} from "@/features/event-overview/components/BulkActionDialog"

// Figma (Design system): US-107 Přihlášky · Dialog: Kontrola kapacity · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15803-16201 (mobile 15803-16280)
export function BulkConfirmDialog({
  eventId,
  termId,
  applications,
  onClose,
  onDone,
}: {
  eventId: string
  termId: string
  applications: ListedApplication[]
  onClose: () => void
  onDone: (result: { changed: number; unchanged: number }) => void
}) {
  const { t, i18n } = useTranslation("eventOverview")
  const ids = applications.map((application) => application.id)
  const preview = useQuery(bulkConfirmationPreviewQueryOptions(eventId, termId, ids))
  const confirm = useMutation({
    mutationFn: () => confirmSelected(eventId, termId, ids),
    onSuccess: (result) =>
      onDone({ changed: result.confirmed.length, unchanged: result.unchanged.length }),
  })
  const list = new Intl.ListFormat(i18n.language, { style: "long", type: "conjunction" })
  const data = preview.data
  const count = data?.confirmable.length ?? 0
  const beds = (
    places: BulkConfirmationPreview["freePlaces"],
    preview: BulkConfirmationPreview,
  ): string =>
    preview.isShared
      ? String(places.MALE)
      : `${t("bulk.men", { count: places.MALE })} + ${t("bulk.women", { count: places.FEMALE })}`
  return (
    <BulkActionDialog
      title={t("bulk.dialogTitle")}
      isBusy={confirm.isPending}
      onClose={onClose}
      submit={
        <Button
          size="lg"
          className="h-12 md:min-w-40"
          disabled={!data || count === 0 || confirm.isPending}
          onClick={() => confirm.mutate()}
        >
          {t("bulk.confirmSubmit")}
        </Button>
      }
    >
      {preview.isPending ? (
        <LoadingState label={t("queue.loading")} />
      ) : preview.isError ? (
        <ErrorState
          title={t("bulk.dialogTitle")}
          error={preview.error}
        />
      ) : (
        <>
          <BulkDetail
            label={t("bulk.selected")}
            value={t("bulk.selectedApplications", { count: data?.selectedCount })}
          />
          <BulkDetail
            label={t("bulk.willConfirm")}
            value={<BulkNames names={data?.confirmable.map((row) => row.name) ?? []} />}
          />
          {data && (
            <BulkDetail
              label={t("bulk.freeBedsAfter")}
              value={t("bulk.freeBedsChange", {
                before: beds(data.freePlaces, data),
                after: beds(data.freePlacesAfter, data),
              })}
            />
          )}
          {data && data.skipped.length > 0 && (
            <Alert className="items-center rounded-xl bg-secondary px-4 py-4 has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] [&>svg]:size-5 [&>svg]:translate-y-0 [&>svg]:self-center">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle className="line-clamp-none font-medium tracking-normal text-foreground">
                {t("bulk.alertTitle", { confirmed: count, selected: data.selectedCount })}
              </AlertTitle>
              <AlertDescription>
                {t("bulk.skippedStays", {
                  count: data.skipped.length,
                  names: list.format(data.skipped.map((row) => row.name)),
                })}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
      {confirm.error && (
        <ErrorState
          title={t("bulk.dialogTitle")}
          error={confirm.error}
        />
      )}
    </BulkActionDialog>
  )
}
