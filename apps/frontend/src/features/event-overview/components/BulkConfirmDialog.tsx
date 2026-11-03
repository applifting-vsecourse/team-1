import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { TriangleAlert, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import type { ListedApplication } from "@/features/event-overview/api/applications"
import {
  bulkConfirmationPreviewQueryOptions,
  confirmSelected,
} from "@/features/event-overview/api/bulkConfirmation"
import type { BulkResultView } from "@/features/event-overview/lib/bulk-result"

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  )
}

// Figma (Design system): US-107 Přihlášky · Dialog: Kontrola kapacity · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15803-16201 (mobile 15803-16280)
export function BulkConfirmDialog({
  eventId,
  term,
  applications,
  onClose,
  onDone,
}: {
  eventId: string
  term: { id: string; startsOn: string; endsOn: string }
  applications: ListedApplication[]
  onClose: () => void
  onDone: (result: BulkResultView) => void
}) {
  const { t, i18n } = useTranslation("eventOverview")
  const client = useQueryClient()
  const ids = applications.map((application) => application.id)
  const preview = useQuery(bulkConfirmationPreviewQueryOptions(eventId, term.id, ids))
  const confirm = useMutation({
    mutationFn: () => confirmSelected(eventId, term.id, ids),
    onSuccess: async (result) => {
      await client.invalidateQueries({
        queryKey: ["eventOverview"],
        predicate: (query) => query.queryKey[1] !== "bulkConfirmationPreview",
      })
      const byId = new Map(applications.map((application) => [application.id, application]))
      const pick = (list: string[]) =>
        list.flatMap((id) => {
          const application = byId.get(id)
          return application ? [application] : []
        })
      const confirmedIds = new Set(result.confirmed)
      onDone({
        term,
        confirmed: pick(result.confirmed),
        unchanged: applications.filter((application) => !confirmedIds.has(application.id)),
      })
    },
  })
  const list = new Intl.ListFormat(i18n.language, { style: "long", type: "conjunction" })
  const data = preview.data
  const count = data?.confirmable.length ?? 0
  const free = data
    ? data.isShared
      ? String(data.freePlaces.MALE)
      : `${t("bulk.men", { count: data.freePlaces.MALE })} + ${t("bulk.women", { count: data.freePlaces.FEMALE })}`
    : ""
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !confirm.isPending) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto p-6 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:p-4 max-sm:shadow-none sm:max-w-160"
      >
        <DialogHeader className="flex-row items-start gap-4 text-left">
          <DialogTitle className="flex-1 text-2xl tracking-tight">
            {t("bulk.dialogTitle")}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            aria-label={t("bulk.close")}
            disabled={confirm.isPending}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </DialogHeader>
        {preview.isPending ? (
          <LoadingState label={t("queue.loading")} />
        ) : preview.isError ? (
          <ErrorState
            title={t("bulk.dialogTitle")}
            error={preview.error}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <Detail
              label={t("bulk.selected")}
              value={t("bulk.selectedApplications", { count: data?.selectedCount })}
            />
            <Detail
              label={t("bulk.freeBeds")}
              value={free}
            />
            <Detail
              label={t("bulk.canConfirm")}
              value={list.format(data?.confirmable.map((row) => row.name) ?? [])}
            />
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
          </div>
        )}
        {confirm.error && (
          <ErrorState
            title={t("bulk.dialogTitle")}
            error={confirm.error}
          />
        )}
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button
            variant="ghost"
            size="lg"
            className="h-12 md:flex-1"
            disabled={confirm.isPending}
            onClick={onClose}
          >
            {t("bulk.cancel")}
          </Button>
          <Button
            size="lg"
            className="h-12 md:flex-1"
            disabled={!data || count === 0 || confirm.isPending}
            onClick={() => confirm.mutate()}
          >
            {t("bulk.confirmSubmit", { count })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
