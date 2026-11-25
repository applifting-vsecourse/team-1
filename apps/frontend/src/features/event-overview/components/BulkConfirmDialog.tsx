import { useState } from "react"
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
  currentPageIds,
  onClose,
  onDone,
}: {
  eventId: string
  termId: string
  applications: ListedApplication[]
  currentPageIds?: ReadonlySet<string>
  onClose: () => void
  onDone: (result: { changed: number; unchanged: number }) => void
}) {
  const { t, i18n } = useTranslation("eventOverview")
  const offPage = currentPageIds ? applications.filter((row) => !currentPageIds.has(row.id)) : []
  const ids = applications.map((application) => application.id)
  const preview = useQuery({
    ...bulkConfirmationPreviewQueryOptions(eventId, termId, ids),
    staleTime: Infinity,
  })
  const [hasChanged, setChanged] = useState(false)
  const confirm = useMutation({
    mutationFn: (shownIds: string[]) => confirmSelected(eventId, termId, shownIds),
    onSuccess: (result) =>
      onDone({ changed: result.confirmed.length, unchanged: ids.length - result.confirmed.length }),
  })
  const list = new Intl.ListFormat(i18n.language, { style: "long", type: "conjunction" })
  const data = preview.data
  // US-107, changed preview · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=22582-86199
  const checkAndConfirm = async () => {
    if (!data || preview.isFetching || confirm.isPending) return
    const latest = await preview.refetch()
    if (!latest.isSuccess) return
    const eligible = latest.data.confirmable.map((row) => row.applicationId)
    const previous = data.confirmable
    if (
      eligible.length !== previous.length ||
      eligible.some((id, index) => id !== previous[index]?.applicationId) ||
      latest.data.freePlacesAfter.MALE !== data.freePlacesAfter.MALE ||
      latest.data.freePlacesAfter.FEMALE !== data.freePlacesAfter.FEMALE
    ) {
      setChanged(true)
      return
    }
    // A bed freed after the preview must not confirm a person the organizer saw as skipped.
    if (eligible.length) confirm.mutate(eligible)
  }
  const count = data?.confirmable.length ?? 0
  const beds = (
    places: BulkConfirmationPreview["freePlaces"],
    preview: BulkConfirmationPreview,
  ): string =>
    preview.isShared
      ? String(places.MALE)
      : t("bulk.freeBedsByGender", { men: places.MALE, women: places.FEMALE })
  return (
    <BulkActionDialog
      title={t("bulk.dialogTitle")}
      isBusy={confirm.isPending || preview.isRefetching}
      onClose={onClose}
      submit={
        <Button
          size="lg"
          className="h-12 md:min-w-40"
          disabled={
            !data || count === 0 || confirm.isPending || preview.isFetching || preview.isError
          }
          onClick={() => void checkAndConfirm()}
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
          onRetry={() => void preview.refetch()}
          error={preview.error}
        />
      ) : (
        <>
          {hasChanged && (
            <Alert role="status">
              <TriangleAlert aria-hidden />
              <AlertTitle>{t("bulk.changedTitle")}</AlertTitle>
              <AlertDescription>{t("bulk.changedDescription")}</AlertDescription>
            </Alert>
          )}
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
      {offPage.length > 0 && (
        <>
          <BulkDetail
            label={t("bulk.onThisPage")}
            value={t("bulk.selectedApplications", { count: applications.length - offPage.length })}
          />
          <BulkDetail
            label={t("bulk.onOtherPages")}
            value={
              <>
                {t("bulk.selectedApplications", { count: offPage.length })} ·{" "}
                {list.format(offPage.map((row) => [row.firstName, row.lastName].join(" ")))}
              </>
            }
          />
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
