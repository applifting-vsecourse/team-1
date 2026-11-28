import { Link, type LinkProps } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Card } from "@/components/ui/card"
import { formatCzk } from "@/lib/money"
import { termDates, termName, termTitle } from "@/lib/term-label"

import type { MyApplication, MyApplicationTerm } from "@/features/participant/api/applications"
import { TermStatusBadge } from "@/features/participant/components/TermSummary"

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

/** The line under a term that says what its status means for the applicant; nothing for a plain one. */
function TermNote({ application, term }: { application: MyApplication; term: MyApplicationTerm }) {
  const { t } = useTranslation(["participant", "common"])
  const payment = application.paymentDetails?.terms.find(({ termId }) => termId === term.termId)
  const note =
    term.status === "WAITLISTED"
      ? t("detail.terms.waitlistNote")
      : term.status === "CANCELLED" || term.status === "TO_EVALUATE"
        ? t(`common:termPayment.note.${term.status}`)
        : term.status === "ARCHIVED"
          ? [
              isFullyArchived(application) ? null : t("detail.archivedText"),
              term.archivedOverpaymentCzk
                ? `${t("paymentStatus.OVERPAID")} · ${formatCzk(term.archivedOverpaymentCzk)}`
                : null,
            ]
              .filter(Boolean)
              .join(" ")
          : payment && payment.owedCzk < 0
            ? `${t("paymentStatus.OVERPAID")} · ${formatCzk(-payment.owedCzk)}. ${t("payment.overpaymentRefund")}`
            : null
  return note ? <p className="col-start-1 text-sm text-muted-foreground">{note}</p> : null
}

/**
 * The terms of the application in one card: name, dates, status and — for a confirmed term — the
 * price. What is owed is in the to-do card, so it is not repeated here (Figma F4).
 */
// Figma (Design system v2): Sekce · Termíny · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27649-35095 (360 px: 24910-14762)
export function ApplicationTermList({ application }: { application: MyApplication }) {
  return (
    <Card className="gap-0 divide-y divide-border p-0">
      {application.terms.map((term) => (
        // A grid on a phone (name | status, then dates, note, price), a row from `sm` (Figma 27649:35286).
        <div
          key={term.termId}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-0.5 px-4 py-3 sm:flex sm:items-center"
        >
          <div className="contents sm:flex sm:min-w-0 sm:flex-1 sm:flex-col sm:gap-0.5">
            <h3 className="col-start-1 font-semibold wrap-anywhere">{termTitle(term)}</h3>
            {termName(term) ? (
              <p className="col-start-1 text-sm text-muted-foreground tabular-nums">
                {termDates(term)}
              </p>
            ) : null}
            <TermNote
              application={application}
              term={term}
            />
          </div>
          <div className="col-start-2 row-start-1">
            <TermStatusBadge term={term} />
          </div>
          {term.status === "CONFIRMED" ? (
            <span className="col-start-1 pt-1 text-sm font-medium tabular-nums sm:w-34 sm:pt-0 sm:text-right">
              {formatCzk(term.priceCzk)}
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="hidden sm:block sm:w-34"
            />
          )}
        </div>
      ))}
    </Card>
  )
}

type BeforeEventLink = { key: string; title: string; status?: string; link: LinkProps }

/**
 * „Před akcí“: the pages to arrange before the event — a chosen transport, meals, health and the
 * program — each a row that says whether it is filled in. A transport still to choose is in the
 * to-do card instead.
 */
// Figma (Design system v2): Sekce · Před akcí · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27649-35160 (paid: 24910-14895)
export function BeforeEvent({ application }: { application: MyApplication }) {
  const { t } = useTranslation("participant")
  const applicationId = application.id
  const filled = (isDone: boolean) => t(isDone ? "detail.before.filled" : "detail.before.notFilled")
  const links: BeforeEventLink[] = [
    // After the term is over the choice can no longer be changed (D-192).
    ...application.terms
      .filter(
        (term) =>
          term.status === "CONFIRMED" &&
          term.transportOffered &&
          term.termEditable &&
          term.transportDecided,
      )
      .map((term) => ({
        key: `transport-${term.termId}`,
        title: t("detail.steps.transport"),
        status: `${termTitle(term)} · ${t("detail.before.chosen")}`,
        link: {
          to: ROUTES.participant.applicationTransport,
          hash: `transport-${term.termId}`,
          params: { applicationId },
        },
      })),
    // The meals can be changed until the last term that is not cancelled is over (D-192).
    ...(application.mealsEditable
      ? [
          {
            key: "meals",
            title: t("detail.meals"),
            status: filled(application.mealsDecided),
            link: { to: ROUTES.participant.applicationMeals, params: { applicationId } },
          },
        ]
      : []),
    {
      key: "health",
      title: t("detail.health"),
      status: filled(application.healthDecided),
      link: { to: ROUTES.participant.applicationHealth, params: { applicationId } },
    },
    ...(application.terms.some((term) => term.status === "CONFIRMED")
      ? [
          {
            key: "program",
            title: t("detail.program"),
            link: { to: ROUTES.participant.applicationProgram, params: { applicationId } },
          },
        ]
      : []),
  ]

  return (
    <section
      aria-labelledby="application-before"
      className="flex flex-col gap-3"
    >
      <h2
        id="application-before"
        className="text-xl font-semibold"
      >
        {t("detail.before.title")}
      </h2>
      <Card className="gap-0 divide-y divide-border overflow-hidden p-0">
        {links.map(({ key, title, status, link }) => (
          <Link
            key={key}
            {...link}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-action-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">{title}</span>
              {status ? <span className="text-sm text-muted-foreground">{status}</span> : null}
            </span>
            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 text-muted-foreground"
            />
          </Link>
        ))}
      </Card>
    </section>
  )
}
