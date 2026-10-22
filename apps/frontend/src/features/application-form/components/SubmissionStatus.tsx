import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { currentLanguage } from "@/i18n"
import { formatDateRange } from "@/lib/date"

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
// Figma (Design system): M06 Stav a platba po odeslání · 360 px · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=12666-20366
export function SubmissionStatus({ accessToken }: SubmissionStatusProps) {
  const { t } = useTranslation("applicationForm")
  const { data } = useSuspenseQuery(submissionStatusQueryOptions(accessToken))
  const termCount = data.applications.reduce((sum, a) => sum + a.terms.length, 0)
  // The reference people know the application by: the one whose number is the payment's variable symbol.
  const [firstApplication] = data.applications
  const referenceApplication =
    data.applications.find((a) => a.variableSymbol === data.payment?.variableSymbol) ??
    firstApplication
  if (!referenceApplication) return null

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl/11 sm:font-bold">
        {t("confirmation.title")}
      </h1>

      <section className="flex flex-col gap-4 rounded-lg border bg-status-success-bg p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-status-success">
          {referenceApplication.code} · {data.eventName}
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

      {data.payment ? (
        <PaymentCard
          payment={data.payment}
          code={referenceApplication.code}
        />
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
          <span className="sr-only"> · {term.name}</span>
        </p>
        <div className="flex items-center gap-4">
          <Badge
            variant={isConfirmed ? "success" : "secondary"}
            className="h-7"
          >
            {isConfirmed ? t("confirmation.status.confirmed") : t("confirmation.status.pending")}
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
            ) : (
              t("confirmation.doNotPayYet")
            )}
          </span>
        </div>
      </Card>
    </li>
  )
}

// Figma (Design system): V04 Platba za potvrzené termíny · node-id=12710-1633
function PaymentCard({
  payment,
  code,
}: {
  payment: NonNullable<SubmissionStatusData["payment"]>
  code: string
}) {
  const { t } = useTranslation("applicationForm")

  return (
    <Card className="gap-4 p-4 sm:p-6">
      <h2 className="text-2xl font-semibold sm:text-lg">{t("confirmation.payment.title")}</h2>
      <p className="text-4xl/11 font-bold text-link">
        <MoneyAmount amountCzk={payment.amountCzk} />
      </p>
      <p className="text-sm text-muted-foreground">
        {payment.parts.map((part, index) => (
          <span key={part.firstName + index}>
            {index > 0 ? " + " : null}
            {part.firstName}: <MoneyAmount amountCzk={part.amountCzk} />
          </span>
        ))}
      </p>
      <dl className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <dt className="text-xs font-medium text-muted-foreground">
            {t("confirmation.payment.account")}
          </dt>
          <dd className="text-lg font-semibold">{payment.bankAccount}</dd>
        </div>
        <div className="flex flex-col gap-4">
          <dt className="text-xs font-medium text-muted-foreground">
            {t("confirmation.payment.variableSymbol")}
          </dt>
          <dd className="text-lg font-semibold">{payment.variableSymbol}</dd>
        </div>
      </dl>
      <p className="text-xs font-medium text-muted-foreground">
        {t("confirmation.payment.variableSymbolNote", { code })}
      </p>
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
