import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatCzk } from "@/lib/money"
import { termDates, termName } from "@/lib/term-label"

import type { MyApplication, MyApplicationTerm } from "@/features/participant/api/applications"
import { TermStatusBadge } from "@/features/participant/components/TermSummary"

/** The anchor of the payment cards, which the payment step links to. */
export const PAYMENT_SECTION_ID = "application-payment"

type Step = { key: string; title: string; isDone: boolean; link: ReactNode }

/**
 * The steps of one term, by its status. Only a confirmed term has steps: a term still to be
 * evaluated, a waitlisted one or a cancelled one has nothing to arrange yet (US-149). Meals and
 * health are entered once for the whole application, so they read the same in every term.
 */
export function termSteps(
  application: MyApplication,
  term: MyApplicationTerm,
  t: TFunction<"participant">,
): Step[] {
  if (term.status !== "CONFIRMED") return []
  const applicationId = application.id
  const steps: Step[] = []

  const payment = application.paymentDetails?.terms.find(({ termId }) => termId === term.termId)
  if (payment && payment.dueCzk > 0) {
    const isDone = payment.owedCzk <= 0
    steps.push({
      key: "payment",
      title: t("detail.steps.payment"),
      isDone,
      link: (
        <a
          href={`#${PAYMENT_SECTION_ID}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {isDone
            ? t("detail.steps.paymentView")
            : t("detail.steps.paymentPay", { amount: formatCzk(payment.owedCzk) })}
        </a>
      ),
    })
  }

  if (term.transportOffered) {
    steps.push({
      key: "transport",
      title: t("detail.steps.transport"),
      isDone: term.transportDecided,
      link: (
        <Link
          to={ROUTES.participant.applicationTransport}
          params={{ applicationId }}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t(term.transportDecided ? "detail.steps.transportView" : "detail.steps.transportChoose")}
        </Link>
      ),
    })
  }

  steps.push(
    {
      key: "meals",
      title: t("detail.steps.meals"),
      isDone: application.mealsDecided,
      link: (
        <Link
          to={ROUTES.participant.applicationMeals}
          params={{ applicationId }}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t(application.mealsDecided ? "detail.steps.mealsView" : "detail.steps.mealsFill")}
        </Link>
      ),
    },
    {
      key: "health",
      title: t("detail.steps.health"),
      isDone: application.healthDecided,
      link: (
        <Link
          to={ROUTES.participant.applicationHealth}
          params={{ applicationId }}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t(application.healthDecided ? "detail.steps.healthView" : "detail.steps.healthFill")}
        </Link>
      ),
    },
  )
  return steps
}

/** One card per confirmed term with what the participant has to arrange before the event. */
// Figma (Design system): US-149 Dva termíny a kroky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=24910-14581 (360 px: node-id=24910-14762)
export function TermSteps({ application }: { application: MyApplication }) {
  const { t } = useTranslation("participant")
  const cards = application.terms
    .map((term) => ({ term, steps: termSteps(application, term, t) }))
    .filter(({ steps }) => steps.length > 0)
  if (cards.length === 0) return null

  return (
    <ul className="flex flex-col gap-4">
      {cards.map(({ term, steps }) => (
        <li key={term.termId}>
          <Card
            className="gap-4 p-6"
            aria-labelledby={`steps-${term.termId}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3
                  id={`steps-${term.termId}`}
                  className="text-lg font-semibold tracking-tight"
                >
                  {termName(term) ?? termDates(term)}
                </h3>
                {termName(term) ? (
                  <p className="text-sm text-muted-foreground tabular-nums">{termDates(term)}</p>
                ) : null}
              </div>
              <TermStatusBadge term={term} />
            </div>
            <h4 className="text-sm font-medium">{t("detail.steps.title")}</h4>
            <ul className="flex flex-col">
              {steps.map((step) => (
                <li
                  key={step.key}
                  className="flex items-center justify-between gap-3 border-t py-3 first:border-t-0 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium">{step.title}</span>
                    {step.link}
                  </div>
                  <Badge variant={step.isDone ? "success" : "warning"}>
                    {t(step.isDone ? "detail.steps.done" : "detail.steps.todo")}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </li>
      ))}
    </ul>
  )
}
