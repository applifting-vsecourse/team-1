import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { apiErrorCode } from "@/lib/api-client"

import type { ListedApplication } from "@/features/event-overview/api/applications"
import type { BulkDecision } from "@/features/event-overview/api/bulkDecision"
import {
  bulkEvaluationPreviewQueryOptions,
  evaluateSelected,
  EVALUATION_PLAN_CHANGED,
  freeBedsTotal,
  type BulkEvaluationPreview,
  type BulkEvaluationResult,
} from "@/features/event-overview/api/bulkEvaluation"
import { BulkActionDialog } from "@/features/event-overview/components/BulkActionDialog"

// Figma (Design system v2): US-140 Více než se vejde, nic nevybráno · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27137-114904 (mobile 27137-115190)
// Figma (Design system v2): US-140 Více než se vejde, Zamítnout · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27137-115342 (mobile 27137-115627)
// Figma (Design system v2): US-140 Více než se vejde, lůžka podle pohlaví · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27137-115778 (mobile 27137-116064)
// Figma (Design system v2): US-140 Vše se vejde · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27137-116216 (mobile 27137-116491)
// Figma (Design system v2): US-140 Změna kapacity · nové potvrzení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24909-149262 (mobile 24909-149528)
/**
 * Evaluates the selected applications in one step (US-140): shows how many are confirmed and, when
 * some do not fit, asks what happens to the rest (waitlist or reject, no default). When the
 * capacity changed meanwhile the server changes nothing, and the dialog shows the new result to be
 * confirmed again.
 */
export function BulkEvaluateDialog({
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
  onDone: (result: BulkEvaluationResult) => void
}) {
  const { t } = useTranslation("eventOverview")
  const ids = applications.map((application) => application.id)
  const preview = useQuery(bulkEvaluationPreviewQueryOptions(eventId, termId, ids))
  // The numbers the organizer is shown and confirms; replaced when the server says they are stale.
  const [shown, setShown] = useState<BulkEvaluationPreview | null>(null)
  const [staleFreeBeds, setStaleFreeBeds] = useState<number | null>(null)
  // No default: the organizer chooses what happens to those who do not fit.
  const [rest, setRest] = useState<BulkDecision | undefined>(undefined)
  const data = shown ?? preview.data
  const hasRest = (data?.rest.total ?? 0) > 0
  const evaluate = useMutation({
    mutationFn: (expected: BulkEvaluationPreview["confirm"]["byGender"]) =>
      evaluateSelected(eventId, termId, ids, expected, hasRest ? rest : undefined),
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
          disabled={!data || evaluate.isPending || preview.isFetching || (hasRest && !rest)}
          onClick={() => data && evaluate.mutate(data.confirm.byGender)}
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
            <Alert>
              <TriangleAlert aria-hidden="true" />
              <AlertTitle className="line-clamp-none">
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
          {hasRest ? (
            <>
              <RestWarning data={data} />
              <RestChoice
                count={data.rest.total}
                rest={rest}
                onChange={setRest}
                isDisabled={evaluate.isPending}
              />
            </>
          ) : (
            <p>{t("bulkEvaluation.confirmSentence", { count: data.confirm.total })}</p>
          )}
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

/** Some selected applications do not fit: how many were selected, how many beds are free. */
function RestWarning({ data }: { data: BulkEvaluationPreview }) {
  const { t } = useTranslation("eventOverview")
  const { confirm, selected } = data
  const description = (): string => {
    if (confirm.total === 0) return t("bulkEvaluation.restWarningNone")
    if (data.isShared) return t("bulkEvaluation.restWarningBody", { count: confirm.total })
    return t("bulkEvaluation.restWarningGendered", {
      women: t("bulkEvaluation.confirmWomen", {
        count: confirm.byGender.FEMALE,
        of: selected.byGender.FEMALE,
      }),
      men: t("bulkEvaluation.confirmMen", {
        count: confirm.byGender.MALE,
        of: selected.byGender.MALE,
      }),
    })
  }
  return (
    <Alert>
      <TriangleAlert aria-hidden="true" />
      <AlertTitle className="line-clamp-none">
        {t("bulkEvaluation.restWarning", { count: selected.total, free: freeBedsTotal(data) })}
      </AlertTitle>
      <AlertDescription>{description()}</AlertDescription>
    </Alert>
  )
}

/** What happens to those who do not fit; no default, the organizer chooses. */
function RestChoice({
  count,
  rest,
  onChange,
  isDisabled,
}: {
  count: number
  rest: BulkDecision | undefined
  onChange: (rest: BulkDecision) => void
  isDisabled: boolean
}) {
  const { t } = useTranslation("eventOverview")
  return (
    <div className="flex flex-col gap-3">
      <p
        id="bulk-evaluation-rest-question"
        className="text-sm font-medium"
      >
        {t("bulkEvaluation.restQuestion", { count })}
      </p>
      <RadioGroup
        value={rest ?? ""}
        onValueChange={(value) => onChange(value as BulkDecision)}
        aria-labelledby="bulk-evaluation-rest-question"
        disabled={isDisabled}
      >
        {(["WAITLIST", "REJECT"] as const).map((option) => (
          <div
            key={option}
            className="flex items-center gap-3"
          >
            <RadioGroupItem
              id={`bulk-evaluation-rest-${option}`}
              value={option}
            />
            <Label htmlFor={`bulk-evaluation-rest-${option}`}>
              {t(option === "WAITLIST" ? "bulkDecision.waitlist" : "bulkDecision.reject")}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
