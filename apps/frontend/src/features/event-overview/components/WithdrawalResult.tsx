import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/date"
import { formatCzk } from "@/lib/money"

import { type WithdrawalOutcome } from "@/features/event-overview/components/OrganizerWithdrawal"

/**
 * US-32: what the withdrawal did, shown in the application detail after it is saved.
 * The frame draws a page of its own; here it is a block of the detail (see the PR).
 */
// Figma (Design system): #32 Účastník byl odhlášen · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-35491 (mobile: 19786-35632)
export function WithdrawalResult({
  outcome,
  onBack,
}: {
  outcome: WithdrawalOutcome
  onBack: () => void
}) {
  const { t } = useTranslation("eventOverview")
  return (
    <section
      aria-labelledby="withdrawal-result-title"
      className="flex flex-col gap-4"
    >
      <h2
        id="withdrawal-result-title"
        className="text-2xl font-bold tracking-tight"
      >
        {t("withdrawal.result.title")}
      </h2>
      {outcome.terms.map((term) => (
        <div
          key={term.termId}
          className="flex flex-col gap-4 rounded-xl border bg-card p-4"
        >
          <h3 className="text-2xl font-bold tracking-tight">
            {t("withdrawal.result.term", { term: term.title })}
          </h3>
          {term.hasFinancialImpact ? (
            <p>
              {t("withdrawal.result.money", {
                debt: formatCzk(term.debtCzk),
                overpayment: formatCzk(term.overpaymentCzk),
              })}
            </p>
          ) : null}
          <p>
            {t("withdrawal.result.history", {
              date: formatDateTime(outcome.changedAt),
              who: outcome.changedByName ?? t("termStatus.system"),
            })}
          </p>
          <p>
            {t("withdrawal.result.transition", {
              from: t(`termStatus.state.${term.fromStatus}`),
              to: t("termStatus.state.CANCELLED"),
            })}
          </p>
          <p>{t("withdrawal.result.emailSent")}</p>
        </div>
      ))}
      <Button
        variant="ghost"
        size="lg"
        onClick={onBack}
      >
        {t("withdrawal.result.back")}
      </Button>
    </section>
  )
}
