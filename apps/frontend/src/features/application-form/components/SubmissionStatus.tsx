import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CopyButton } from "@/components/atoms/CopyButton"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { currentLanguage } from "@/i18n"
import { formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { termName } from "@/lib/term-label"

import {
  submissionStatusQueryOptions,
  type SubmissionStatus as SubmissionStatusData,
  type SubmittedApplication,
} from "@/features/application-form/api/submissionStatus"

type SubmissionStatusProps = {
  accessToken: string
}

/** Names of the participants, "Jana Nováková a Matěj Novák". */
function listNames(applications: SubmittedApplication[]): string {
  const names = applications.map(({ firstName, lastName }) => `${firstName} ${lastName}`)
  return new Intl.ListFormat(currentLanguage(), { style: "long", type: "conjunction" }).format(
    names,
  )
}

/**
 * The page right after sending: status of every term of every participant, what to pay and
 * where, and how the applicant gets into their account. A waitlisted term is only "waiting
 * for confirmation" — the place in line is never sent (docs/PROJEKT.md, 2026-10-21).
 */
// Figma (Design system): V04 Stav a platba · nový účet · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11968-120
// Figma (Design system): V06 Stav a platba · existující účet · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=11968-171
// Figma (Design system): V04a Všechny termíny na čekací listině · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12710-2345
// Figma (Design system): Potvrzení odeslání · Po odeslání (K vyhodnocení) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15751-1267 (360 px: node-id=15751-1297)
// Figma (Design system): M06 Stav a platba po odeslání · 360 px · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-20366
export function SubmissionStatus({ accessToken }: SubmissionStatusProps) {
  const { t } = useTranslation("applicationForm")
  const { data } = useSuspenseQuery(submissionStatusQueryOptions(accessToken))
  const termCount = data.applications.reduce((sum, a) => sum + a.terms.length, 0)
  const [firstApplication] = data.applications
  if (!firstApplication) return null
  const payers = data.applications.filter((application) => application.payment)
  // Manual evaluation mode: nothing is decided yet, so it is not a waitlist (US-102).
  const isAwaitingEvaluation = data.applications.some((application) =>
    application.terms.some((term) => term.status === "TO_EVALUATE"),
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl/11 sm:font-bold">
        {t("confirmation.title")}
      </h1>

      <section className="flex flex-col gap-4 rounded-lg border bg-status-success-bg p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-status-success">
          {firstApplication.code} · {data.eventName}
        </h2>
        <p>
          {t(termCount === 1 ? "confirmation.introOneTerm" : "confirmation.intro", {
            names: listNames(data.applications),
          })}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">{t("confirmation.termsHeading")}</h2>
        <ul className="flex flex-col gap-3">
          {data.applications.flatMap((application) =>
            application.terms.map((term) => (
              <TermStatusCard
                key={`${application.variableSymbol}-${term.termId}`}
                application={application}
                term={term}
              />
            )),
          )}
        </ul>
      </section>

      {payers.length > 0 ? (
        <PaymentCard payers={payers} />
      ) : isAwaitingEvaluation ? (
        // Figma (Design system): Togena / Alert · node-id=15751-1290 (360 px: 15751-1320)
        <Alert>
          <TriangleAlert aria-hidden />
          <AlertTitle>{t("confirmation.toEvaluate.alertTitle")}</AlertTitle>
          <AlertDescription>{t("confirmation.toEvaluate.alertText")}</AlertDescription>
        </Alert>
      ) : (
        <section className="flex flex-col gap-4 rounded-lg border bg-status-waitlist-bg p-4 sm:p-6">
          <h2 className="text-2xl font-semibold text-status-waitlist">
            {t("confirmation.waitlist.title")}
          </h2>
          <p>{t("confirmation.waitlist.description")}</p>
        </section>
      )}

      <AccountCard data={data} />
    </div>
  )
}

// Figma (Design system): DS / Registration term status · node-id=12705-947
function TermStatusCard({
  application,
  term,
}: {
  application: SubmittedApplication
  term: SubmittedApplication["terms"][number]
}) {
  const { t } = useTranslation("applicationForm")
  const isConfirmed = term.status === "CONFIRMED"

  return (
    <li>
      <Card className="gap-2 rounded-md p-4">
        <h3 className="text-lg font-semibold">
          {application.firstName} {application.lastName}
        </h3>
        <p className="text-sm text-muted-foreground">
          {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
          {termName(term) ? <span className="sr-only"> · {termName(term)}</span> : null}
        </p>
        <div className="flex items-center gap-4">
          <Badge
            variant={isConfirmed ? "success" : "secondary"}
            className="h-7"
          >
            {t(
              isConfirmed
                ? "confirmation.status.confirmed"
                : term.status === "ARCHIVED"
                  ? "confirmation.status.archived"
                  : term.status === "CANCELLED"
                    ? "confirmation.status.cancelled"
                    : term.status === "TO_EVALUATE"
                      ? "confirmation.status.toEvaluate"
                      : "confirmation.status.waitlisted",
            )}
          </Badge>
          <span
            className={
              isConfirmed
                ? "flex-1 text-right text-sm"
                : "flex-1 text-right text-sm text-muted-foreground"
            }
          >
            {isConfirmed ? (
              <MoneyAmount amountCzk={term.priceCzk} />
            ) : term.status === "ARCHIVED" ||
              term.status === "CANCELLED" ||
              term.status === "TO_EVALUATE" ? null : (
              t("confirmation.doNotPayYet")
            )}
          </span>
        </div>
        {term.status === "TO_EVALUATE" ? <p>{t("confirmation.toEvaluate.note")}</p> : null}
      </Card>
    </li>
  )
}

// Figma (Design system): V04p Stav a platba · jeden účastník, VS souhrnu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16186-4264
// Figma (Design system): V04p Stav a platba · dva účastníci, VS souhrnu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16186-4335
// Figma (Design system): M06p Stav a platba po odeslání · 360 px · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=16186-4434
// One card for the whole submission: the total, the account once, and the summary variable
// symbol of every paying application. Applications are paid separately (issue #153).
function PaymentCard({ payers }: { payers: SubmittedApplication[] }) {
  const { t } = useTranslation(["applicationForm", "common"])
  const [first] = payers
  const payments = payers.flatMap((application) =>
    application.payment ? [{ application, payment: application.payment }] : [],
  )
  if (!first?.payment) return null
  const hasSeveralPayers = payments.length > 1
  const total = payments.reduce((sum, { payment }) => sum + payment.summary.payableCzk, 0)

  return (
    <Card className="gap-4 p-4 sm:p-6">
      <h2 className="text-2xl font-semibold sm:text-lg">{t("confirmation.payment.title")}</h2>
      <p className="text-4xl/11 font-bold text-link">
        <MoneyAmount amountCzk={total} />
      </p>
      <p className="text-sm text-muted-foreground">
        {payments.map(({ application, payment }, index) => (
          <span key={application.variableSymbol}>
            {index > 0 ? " + " : null}
            {application.firstName}: <MoneyAmount amountCzk={payment.summary.payableCzk} />
          </span>
        ))}
      </p>
      <dl className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <dt className="text-xs font-medium text-muted-foreground">
            {t("confirmation.payment.account")}
          </dt>
          <dd className="flex min-w-0 items-center gap-2 text-lg font-semibold">
            <span className="break-all">{first.payment.bankAccount}</span>
            <CopyButton
              value={first.payment.bankAccount}
              label={t("common:clipboard.copyAccount")}
            />
          </dd>
        </div>
        {payments.map(({ application, payment }) => (
          <div
            key={application.variableSymbol}
            className="flex flex-col gap-4"
          >
            <dt className="text-xs font-medium text-muted-foreground">
              {hasSeveralPayers
                ? t("confirmation.payment.variableSymbolOf", {
                    name: application.firstName,
                    amount: formatCzk(payment.summary.payableCzk),
                  })
                : t("confirmation.payment.variableSymbol")}
            </dt>
            <dd className="flex min-w-0 items-center gap-2 text-lg font-semibold">
              <span className="break-all">{payment.summary.variableSymbol}</span>
              <CopyButton
                value={payment.summary.variableSymbol}
                label={t("common:clipboard.copyVariableSymbol")}
              />
            </dd>
          </div>
        ))}
      </dl>
      {hasSeveralPayers ? (
        <p className="text-xs font-medium text-muted-foreground">
          {t("confirmation.payment.payEachSeparately", {
            list: payments
              .map(({ application, payment }) =>
                t("confirmation.payment.payEachItem", {
                  name: application.firstName,
                  amount: formatCzk(payment.summary.payableCzk),
                  variableSymbol: payment.summary.variableSymbol,
                }),
              )
              .join("; "),
          })}
        </p>
      ) : null}
      <p>{t("confirmation.payment.onlyConfirmed")}</p>
    </Card>
  )
}

// Figma (Design system): V04 Přístup k přihlášce · node-id=12710-1643, V06 Přihláška je v existujícím účtu · node-id=12710-1947
function AccountCard({ data }: { data: SubmissionStatusData }) {
  const { t } = useTranslation("applicationForm")
  const kind = data.isNewAccount ? "newAccount" : "existingAccount"

  return (
    <>
      <Card className="gap-4 p-4 sm:p-6">
        <h2 className="text-lg font-semibold">{t("confirmation.account.title")}</h2>
        <p>{t(`confirmation.account.${kind}`, { email: data.email })}</p>
      </Card>
      <Button
        asChild
        size="lg"
        className="w-full sm:w-fit"
      >
        <Link to={ROUTES.participant.login}>{t(`confirmation.account.${kind}Action`)}</Link>
      </Button>
    </>
  )
}
