import type { ReactNode } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { TFunction } from "i18next"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { PendingButton } from "@/components/atoms/PendingButton"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatCzk } from "@/lib/money"
import { notify } from "@/lib/notify"
import { termDates, termName } from "@/lib/term-label"

import {
  saveRoomWishes,
  type MyApplication,
  type MyApplicationTerm,
} from "@/features/participant/api/applications"
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
function termSteps(
  application: MyApplication,
  term: MyApplicationTerm,
  t: TFunction<"participant">,
  onEditRoomWishes: (termId: string) => void,
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

  // After the term is over the choice can no longer be changed, so the step is gone (D-192).
  if (term.transportOffered && term.termEditable) {
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

  const mealsAndHealth: Step[] = [
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
  ]
  // The meals can be changed until the last term that is not cancelled is over (D-192).
  steps.push(...mealsAndHealth.filter(({ key }) => key !== "meals" || application.mealsEditable))
  if (term.roomWishes !== undefined && term.room === undefined && term.termEditable) {
    const isDone = term.roomWishes.length > 0 || term.noRoomWishes === true
    steps.push({
      key: "roomWishes",
      title: t("roomWishes.title"),
      isDone,
      link: (
        <>
          {isDone ? (
            <p className="text-sm break-words text-muted-foreground">
              {term.roomWishes.length > 0 ? term.roomWishes.join(", ") : t("detail.steps.noWishes")}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href={`#room-wishes-${term.termId}`}
              className={stepLinkClass}
              onClick={() => onEditRoomWishes(term.termId)}
            >
              {t(isDone ? "detail.steps.wishesChange" : "detail.steps.wishesAdd")}
              <ChevronRight
                aria-hidden
                className="size-3.5"
              />
            </a>
            {isDone ? null : (
              <DeclineRoomWishes
                applicationId={applicationId}
                termId={term.termId}
              />
            )}
          </div>
        </>
      ),
    })
  }
  return steps
}

function DeclineRoomWishes({ applicationId, termId }: { applicationId: string; termId: string }) {
  const { t } = useTranslation("participant")
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => saveRoomWishes(applicationId, termId, [], true),
    onSuccess: () => client.invalidateQueries({ queryKey: ["participant", "applications"] }),
    onError: () => notify.error(t("detail.steps.wishesSaveFailed")),
  })

  return (
    <PendingButton
      type="button"
      variant="ghost"
      size="sm"
      isPending={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {t("detail.steps.wishesDecline")}
    </PendingButton>
  )
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
    <Card className="gap-2 p-4">
      <h3 className="text-lg font-semibold tracking-tight">{t("detail.archivedTitle")}</h3>
      <p className="text-sm text-muted-foreground">{t("detail.archivedText")}</p>
    </Card>
  )
}

/**
 * One card per confirmed term with what the participant has to arrange before the event. A cancelled
 * term, and an archived one next to terms that are not archived (#700), get a line of text instead.
 */
// Figma (Design system): US-149 Dva termíny a kroky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-14581 (360 px: node-id=24910-14762)
// Approved pattern (#700, no frame): the card of a cancelled term with the text of US-149 · https://github.com/applifting-vsecourse/team-1/issues/700#issuecomment-7219621671
// Figma (Design system v2): #620 Varianta A · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27171-3647 (360 px: 27171-3838)
export function TermSteps({
  application,
  onEditRoomWishes,
}: {
  application: MyApplication
  onEditRoomWishes: (termId: string) => void
}) {
  const { t } = useTranslation("participant")
  const { t: tCommon } = useTranslation("common")
  // A cancelled or archived term has no steps but still gets its status and a line of text, so the
  // section is not empty. A fully archived application says so once, in ArchivedApplicationCard.
  const isArchived = isFullyArchived(application)
  const cards = application.terms
    .map((term) => ({ term, steps: termSteps(application, term, t, onEditRoomWishes) }))
    .filter(
      ({ term, steps }) =>
        steps.length > 0 ||
        term.status === "CANCELLED" ||
        (term.status === "ARCHIVED" && !isArchived),
    )
  if (cards.length === 0) return null

  return (
    <ul className="flex flex-col gap-3">
      {cards.map(({ term, steps }) => (
        <li key={term.termId}>
          <Card
            className="gap-2 rounded-lg p-3 sm:p-4"
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
                  <p className="text-sm font-medium tabular-nums">{termDates(term)}</p>
                ) : null}
              </div>
              <TermStatusBadge term={term} />
            </div>
            {steps.length === 0 ? (
              <p className="border-t pt-2 text-sm text-muted-foreground">
                {term.status === "ARCHIVED"
                  ? t("detail.archivedText")
                  : tCommon("termPayment.note.CANCELLED")}
              </p>
            ) : (
              <h4 className="border-t pt-2 text-base font-medium">{t("detail.steps.title")}</h4>
            )}
            <ul
              hidden={steps.length === 0}
              className="flex flex-col gap-2"
            >
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
