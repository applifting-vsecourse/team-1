import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { ChevronRight } from "lucide-react"
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

/** Step links end with a „›“ (Figma #509). */
const stepLinkClass =
  "inline-flex w-fit items-center gap-0.5 text-sm font-medium text-link hover:underline"

type Step = { key: string; title: string; isDone: boolean; link: ReactNode }

/**
 * The steps of one term, by its status. Only a confirmed term has steps: a term still to be
 * evaluated, a waitlisted one, a cancelled one or an archived one has nothing to arrange
 * (US-149, US-584). Meals and
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
          className={stepLinkClass}
        >
          {isDone
            ? t("detail.steps.paymentView")
            : t("detail.steps.paymentPay", { amount: formatCzk(payment.owedCzk) })}
          <ChevronRight
            aria-hidden
            className="size-3.5"
          />
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
          hash={`transport-${term.termId}`}
          params={{ applicationId }}
          className={stepLinkClass}
        >
          {t(term.transportDecided ? "detail.steps.transportView" : "detail.steps.transportChoose")}
          <ChevronRight
            aria-hidden
            className="size-3.5"
          />
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
          className={stepLinkClass}
        >
          {t(application.mealsDecided ? "detail.steps.mealsView" : "detail.steps.mealsFill")}
          <ChevronRight
            aria-hidden
            className="size-3.5"
          />
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
          className={stepLinkClass}
        >
          {t(application.healthDecided ? "detail.steps.healthView" : "detail.steps.healthFill")}
          <ChevronRight
            aria-hidden
            className="size-3.5"
          />
        </Link>
      ),
    },
  )
  if (term.roomWishes !== undefined) {
    const hasWishes = term.roomWishes.length > 0
    steps.push({
      key: "roomWishes",
      title: t("roomWishes.title"),
      isDone: hasWishes,
      link: (
        <a
          href={`#room-wishes-${term.termId}`}
          className={stepLinkClass}
        >
          {t(hasWishes ? "detail.steps.wishesView" : "roomWishes.add")}
          <ChevronRight
            aria-hidden
            className="size-3.5"
          />
        </a>
      ),
    })
  }
  if (term.room !== undefined) {
    steps.push({
      key: "room",
      title: t("detail.sections.room"),
      isDone: Boolean(term.room.name),
      link: (
        <a
          href={`#room-${term.termId}`}
          className={stepLinkClass}
        >
          {t("detail.steps.roomView")}
          <ChevronRight
            aria-hidden
            className="size-3.5"
          />
        </a>
      ),
    })
  }
  return steps
}

/** An application whose every term is archived: over, so nothing is left to arrange. */
export function isFullyArchived(application: MyApplication): boolean {
  return (
    application.terms.length > 0 && application.terms.every(({ status }) => status === "ARCHIVED")
  )
}

/** Stands where the steps would be once every term of the application is archived: no steps, just the state. */
// Figma (Design system): US-149 Archivovaná přihláška · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-15353 (360 px: node-id=24910-15443)
export function ArchivedApplicationCard() {
  const { t } = useTranslation("participant")
  return (
    <Card className="gap-2 p-6">
      <h3 className="text-lg font-semibold tracking-tight">{t("detail.archivedTitle")}</h3>
      <p className="text-sm text-muted-foreground">{t("detail.archivedText")}</p>
    </Card>
  )
}

/** One card per confirmed term with what the participant has to arrange before the event. */
// Figma (Design system): US-149 Dva termíny a kroky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-14581 (360 px: node-id=24910-14762)
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
            className="gap-3 rounded-lg p-4"
            aria-labelledby={`steps-${term.termId}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3
                  id={`steps-${term.termId}`}
                  className="text-lg font-bold"
                >
                  {termName(term) ?? termDates(term)}
                </h3>
                {termName(term) ? (
                  <p className="text-sm text-muted-foreground tabular-nums">{termDates(term)}</p>
                ) : null}
              </div>
              <TermStatusBadge term={term} />
            </div>
            <h4 className="border-t pt-3 text-base font-medium">{t("detail.steps.title")}</h4>
            <ul className="flex flex-col gap-2">
              {steps.map((step) => (
                <li
                  key={step.key}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium">{step.title}</span>
                    {step.link}
                  </div>
                  <Badge
                    variant={step.isDone ? "default" : "warning"}
                    className={step.isDone ? "bg-primary text-primary-foreground" : undefined}
                  >
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
