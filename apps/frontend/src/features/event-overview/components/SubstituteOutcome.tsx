import { ArrowLeft, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CopyButton } from "@/components/atoms/CopyButton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import type { Substitute, SubstituteConfirmation } from "@/features/event-overview/api/substitutes"

type OutcomeTerm = { id: string; startsOn: string; endsOn: string }

/** What happened when the organizer confirmed a substitute (US-104). */
export type SubstituteOutcomeData =
  | {
      kind: "done"
      substitute: Substitute
      confirmation: SubstituteConfirmation
      term: OutcomeTerm
      bed: "Male" | "Female" | "Shared"
      freeLeft: number
    }
  | {
      kind: "taken"
      substitute: Substitute
      term: OutcomeTerm
      bed: "Male" | "Female" | "Shared"
    }

// Figma (Design system): US-104 Přihlášky · Náhradník potvrzen · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15780-5819 (mobile 15780-5910)
// Figma (Design system): US-104 Přihlášky · Lůžko už bylo obsazeno · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15780-5974 (mobile 15780-6041)
export function SubstituteOutcome({
  outcome,
  onBack,
}: {
  outcome: SubstituteOutcomeData
  onBack: () => void
}) {
  const { t } = useTranslation("eventOverview")
  const { substitute } = outcome
  const name = `${substitute.firstName} ${substitute.lastName}`
  const range = formatDateRange(outcome.term.startsOn, outcome.term.endsOn, {
    shouldShowYear: true,
  })
  const beds = t(`substitutes.free${outcome.bed}`, {
    count: outcome.kind === "done" ? outcome.freeLeft : 0,
  })
  if (outcome.kind === "taken") {
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
          onClick={onBack}
        >
          {t("substitutes.refresh")}
        </Button>
      </div>
    )
  }
  const { confirmation } = outcome
  const rows = [
    ["total", formatCzk(confirmation.priceCzk)],
    ["paid", formatCzk(0)],
  ] as const
  return (
    <div className="flex flex-col gap-4">
      <p>
        {range} · {beds}
      </p>
      <Alert>
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>
          {t(
            substitute.gender === "FEMALE"
              ? "substitutes.confirmedFemale"
              : "substitutes.confirmedMale",
            { name },
          )}
        </AlertTitle>
        <AlertDescription>
          {t(`substitutes.freeBedsLeft${outcome.bed}`, { count: outcome.freeLeft })}
        </AlertDescription>
      </Alert>
      <p className="text-sm">{t("substitutes.resultCaption")}</p>
      <section className="flex max-w-xl flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-xl font-semibold">
          {t("substitutes.resultTitle", { name, term: range })}
        </h2>
        <Badge
          variant="secondary"
          className="self-start"
        >
          {t("substitutes.paymentPending")}
        </Badge>
        <dl className="flex flex-col gap-2 text-sm">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-3"
            >
              <dt className="text-muted-foreground">{t(`substitutes.${label}`)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <Progress
            value={0}
            className="h-1"
            aria-label={t("substitutes.paid")}
          />
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("substitutes.remaining")}</dt>
            <dd>{formatCzk(confirmation.priceCzk)}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-medium">{t("substitutes.paymentDetails")}</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("substitutes.account")}</span>
            <span className="flex items-center gap-1">
              {confirmation.bankAccount}
              <CopyButton
                value={confirmation.bankAccount}
                label={t("substitutes.account")}
              />
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{t("substitutes.variableSymbol")}</span>
            <span>{confirmation.variableSymbol}</span>
          </div>
        </div>
      </section>
      <Button
        variant="secondary"
        className="self-start rounded-full"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden="true" />
        {t("substitutes.back")}
      </Button>
    </div>
  )
}
