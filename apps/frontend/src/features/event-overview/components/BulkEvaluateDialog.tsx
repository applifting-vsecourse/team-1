import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { apiErrorCode } from "@/lib/api-client"

import type { ListedApplication } from "@/features/event-overview/api/applications"
import {
  bulkEvaluationPreviewQueryOptions,
  evaluateSelected,
  EVALUATION_PLAN_CHANGED,
  freeBedsTotal,
  type BulkEvaluationPreview,
  type BulkEvaluationResult,
} from "@/features/event-overview/api/bulkEvaluation"
import { BulkActionDialog, BulkDetail } from "@/features/event-overview/components/BulkActionDialog"

const ALERT_CLASS =
  "items-center rounded-xl bg-secondary px-4 py-4 has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] [&>svg]:size-5 [&>svg]:translate-y-0 [&>svg]:self-center"
const ALERT_TITLE_CLASS = "line-clamp-none font-medium tracking-normal text-foreground"

// Figma (Design system v2): US-140 Potvrzení · 20 → 10 + 10 · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24909-147946 (mobile 24909-148212)
// Figma (Design system v2): US-140 Potvrzení · lůžka podle pohlaví · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24909-148413 (mobile 24909-148679)
// Figma (Design system v2): US-140 Změna kapacity · nové potvrzení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24909-149262 (mobile 24909-149528)
/**
 * Evaluates the selected applications in one step (US-140): shows how many are confirmed and how
 * many become substitutes, and does it on confirmation. When the capacity changed meanwhile the
 * server changes nothing, and the dialog shows the new result to be confirmed again.
 */
export function BulkEvaluateDialog({
  eventId,
  termId,
  termLabel,
  applications,
  onClose,
  onDone,
}: {
  eventId: string
  termId: string
  termLabel: string
  applications: ListedApplication[]
  onClose: () => void
  onDone: (result: BulkEvaluationResult) => void
}) {
  const { t } = useTranslation("eventOverview")
  const ids = applications.map((application) => application.id)
  const preview = useQuery(bulkEvaluationPreviewQueryOptions(eventId, termId, ids))
  // The numbers the organizer is shown and confirms; replaced when the server says they are stale.
  const [shown, setShown] = useState<BulkEvaluationPreview | null>(null)
  const [staleFreeBeds, setStaleFreeBeds] = useState<number | null>(null)
  const data = shown ?? preview.data
  const evaluate = useMutation({
    mutationFn: (expected: number) => evaluateSelected(eventId, termId, ids, expected),
    onSuccess: onDone,
    onError: async (error) => {
      if (apiErrorCode(error) !== EVALUATION_PLAN_CHANGED || !data) return
      setStaleFreeBeds(freeBedsTotal(data))
      const fresh = await preview.refetch()
      if (fresh.data) setShown(fresh.data)
    },
  })
  const isChanged = staleFreeBeds !== null && data !== undefined
  const isStaleError = apiErrorCode(evaluate.error) === EVALUATION_PLAN_CHANGED
  return (
    <BulkActionDialog
      title={t(isChanged ? "bulkEvaluation.changedTitle" : "bulkEvaluation.title")}
      isBusy={evaluate.isPending}
      onClose={onClose}
      submit={
        <Button
          size="lg"
          className="h-12 md:min-w-40"
          disabled={!data || evaluate.isPending || preview.isFetching}
          onClick={() => data && evaluate.mutate(data.confirm.total)}
        >
          {t(isChanged ? "bulkEvaluation.submitChanged" : "bulkEvaluation.submit")}
        </Button>
      }
    >
      {!data && preview.isPending ? (
        <LoadingState label={t("queue.loading")} />
      ) : !data ? (
        <ErrorState
          title={t("bulkEvaluation.title")}
          error={preview.error ?? new Error()}
        />
      ) : (
        <>
          {isChanged && (
            <Alert className={ALERT_CLASS}>
              <TriangleAlert aria-hidden="true" />
              <AlertTitle className={ALERT_TITLE_CLASS}>
                {t("bulkEvaluation.changedAlert")}
              </AlertTitle>
              <AlertDescription>
                {t(changedKey(staleFreeBeds, freeBedsTotal(data)), {
                  before: staleFreeBeds,
                  after: freeBedsTotal(data),
                })}
              </AlertDescription>
            </Alert>
          )}
          <BulkDetail
            label={t("bulkEvaluation.termAndSelection")}
            value={t("bulkEvaluation.termAndSelectionValue", {
              term: termLabel,
              count: data.selected.total,
            })}
          />
          <Breakdown
            data={data}
            kind="confirm"
          />
          <Breakdown
            data={data}
            kind="waitlist"
          />
          {!isChanged && <BedsAlert data={data} />}
        </>
      )}
      {evaluate.error && !isStaleError && (
        <ErrorState
          title={t("bulkEvaluation.title")}
          error={evaluate.error}
        />
      )}
    </BulkActionDialog>
  )
}

const changedKey = (before: number, after: number) =>
  before > after
    ? "bulkEvaluation.changedLess"
    : before < after
      ? "bulkEvaluation.changedMore"
      : "bulkEvaluation.changedSame"

/** "Will be confirmed" / "Will become substitutes": the count, and per gender with split beds. */
function Breakdown({ data, kind }: { data: BulkEvaluationPreview; kind: "confirm" | "waitlist" }) {
  const { t } = useTranslation("eventOverview")
  const part = data[kind]
  if (data.isShared) {
    return (
      <BulkDetail
        label={t(`bulkEvaluation.${kind}Label`)}
        value={t("bulk.selectedApplications", { count: part.total })}
      />
    )
  }
  const women = kind === "confirm" ? "confirmWomen" : "waitlistWomen"
  const men = kind === "confirm" ? "confirmMen" : "waitlistMen"
  return (
    <BulkDetail
      label={t(`bulkEvaluation.${kind}LabelCount`, { count: part.total })}
      value={`${t(`bulkEvaluation.${women}`, { count: part.byGender.FEMALE, of: data.selected.byGender.FEMALE })} · ${t(`bulkEvaluation.${men}`, { count: part.byGender.MALE, of: data.selected.byGender.MALE })}`}
    />
  )
}

function BedsAlert({ data }: { data: BulkEvaluationPreview }) {
  const { t } = useTranslation("eventOverview")
  const total = freeBedsTotal(data)
  return (
    <Alert className={ALERT_CLASS}>
      <TriangleAlert aria-hidden="true" />
      <AlertTitle className={ALERT_TITLE_CLASS}>
        {t(data.isShared ? "bulkEvaluation.freeBedsShared" : "bulkEvaluation.freeBedsGendered", {
          count: total,
        })}
      </AlertTitle>
      <AlertDescription>
        {data.isShared
          ? t("bulkEvaluation.orderNote")
          : t("bulkEvaluation.freeBedsSplit", {
              women: t("bulkEvaluation.freeWomenBeds", { count: data.freePlaces.FEMALE }),
              men: t("bulkEvaluation.freeMenBeds", { count: data.freePlaces.MALE }),
            })}
      </AlertDescription>
    </Alert>
  )
}
