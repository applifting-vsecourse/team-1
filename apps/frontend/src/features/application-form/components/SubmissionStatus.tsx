import { useState, type ReactNode } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Info } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BrandDivider } from "@/components/atoms/BrandDivider"
import { CopyButton } from "@/components/atoms/CopyButton"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { PaymentQrDownload } from "@/components/molecules/PaymentQrDownload"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { summaryPaymentSpayd } from "@/lib/payment-qr"
import { termName } from "@/lib/term-label"
import { cn } from "@/lib/utils"

import {
  submissionStatusQueryOptions,
  type SubmissionStatus as SubmissionStatusData,
  type SubmittedApplication,
} from "@/features/application-form/api/submissionStatus"

type SubmissionStatusProps = {
  accessToken: string
  /**
   * The signed-in participant account; `null` when nobody (or an organizer) is signed in,
   * `"loading"` while the session is still being read — the action under the account card
   * waits for it, so a signed-in applicant never sees the sign-in link first.
   */
  signedInParticipant?: SignedInParticipant | "loading" | null
}

export type SignedInParticipant = { email: string; mustSetPassword: boolean }

/**
 * The page right after sending: status of every term of every participant, what to pay and
 * where, and how the applicant gets into their account. A waitlisted term is only "waiting
 * for confirmation" — the place in line is never sent (docs/PROJEKT.md, 2026-10-21).
 */
// Figma v2: Po odeslání (K vyhodnocení) · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15751-1267 (360 px: 15751-1297)
// Figma v2: Po odeslání (Potvrzeno, platba) · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15314-2
export function SubmissionStatus({
  accessToken,
  signedInParticipant = null,
}: SubmissionStatusProps) {
  const { t } = useTranslation("applicationForm")
  const { data } = useSuspenseQuery(submissionStatusQueryOptions(accessToken))
  const [firstApplication] = data.applications
  if (!firstApplication) return null
  const payers = data.applications.filter((application) => application.payment)
  // Manual evaluation mode: nothing is decided yet, so it is not a waitlist (US-102).
  const isAwaitingEvaluation = data.applications.some((application) =>
    application.terms.some((term) => term.status === "TO_EVALUATE"),
  )

  return (
    <div
      className={cn(
        "mx-auto grid w-full grid-cols-1 items-start gap-6 px-4 py-6 md:px-6",
        payers.length ? "max-w-300 lg:grid-cols-[minmax(0,1fr)_20rem]" : "max-w-[1008px]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <h1 className="text-[32px]/10 font-bold tracking-tight">{t("confirmation.title")}</h1>
        <p>
          {isAwaitingEvaluation
            ? t("confirmation.subtitleToEvaluate", { event: data.eventName })
            : data.eventName}
        </p>
        {isAwaitingEvaluation ? null : <p>{t("confirmation.sentTo", { email: data.email })}</p>}
        <BrandDivider />

        <ul className="flex flex-col gap-4">
          {data.applications.map((application) => (
            <ApplicationStatusCard
              key={application.variableSymbol}
              application={application}
            />
          ))}
        </ul>
      </div>
      {payers.length > 0 ? (
        <aside className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <PaymentCard
            payers={payers}
            eventName={data.eventName}
          />
        </aside>
      ) : isAwaitingEvaluation ? (
        // Figma v2: Togena / Alert · node-id=15751-1290 (360 px: 15751-1320)
        <Alert className="bg-secondary">
          <Info aria-hidden />
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

      <AccountCard
        data={data}
        signedInParticipant={signedInParticipant}
      />
    </div>
  )
}

function statusKey(status: SubmittedApplication["terms"][number]["status"]) {
  switch (status) {
    case "CONFIRMED":
      return "confirmation.status.confirmed"
    case "ARCHIVED":
      return "confirmation.status.archived"
    case "CANCELLED":
      return "confirmation.status.cancelled"
    case "TO_EVALUATE":
      return "confirmation.status.toEvaluate"
    default:
      return "confirmation.status.waitlisted"
  }
}

// One card per participant: the application number and every chosen term with its status.
function ApplicationStatusCard({ application }: { application: SubmittedApplication }) {
  const { t } = useTranslation("applicationForm")

  return (
    <li>
      <Card className="gap-4 p-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold">
            {application.firstName} {application.lastName}
          </h2>
          <p>{t("confirmation.applicationCode", { code: application.code })}</p>
        </div>
        <ul className="flex flex-col gap-4">
          {application.terms.map((term) => {
            const isConfirmed = term.status === "CONFIRMED"
            const note = isConfirmed
              ? t("confirmation.pricePerConfirmedTerm", { price: formatCzk(term.priceCzk) })
              : term.status === "TO_EVALUATE"
                ? t("confirmation.toEvaluate.note")
                : term.status === "WAITLISTED"
                  ? t("confirmation.doNotPayYet")
                  : null
            return (
              <li
                key={term.termId}
                className="flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
                    {termName(term) ? <span className="sr-only"> · {termName(term)}</span> : null}
                  </span>
                  <Badge
                    variant={
                      isConfirmed ? "success" : term.status === "WAITLISTED" ? "warning" : "neutral"
                    }
                    className={term.status === "WAITLISTED" ? "border-0" : undefined}
                  >
                    {t(statusKey(term.status))}
                  </Badge>
                </div>
                {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
              </li>
            )
          })}
        </ul>
      </Card>
    </li>
  )
}

// One card for the whole submission: the total, the account once, and the summary variable
// symbol of every paying application. Applications are paid separately (issue #153).
function PaymentCard({ payers, eventName }: { payers: SubmittedApplication[]; eventName: string }) {
  const { t } = useTranslation(["applicationForm", "common"])
  const [first] = payers
  const payments = payers.flatMap((application) =>
    application.payment
      ? [
          {
            application,
            payment: application.payment,
            spayd: summaryPaymentSpayd(
              application.payment.bankAccount,
              application.payment.summary.payableCzk,
              application.payment.summary.variableSymbol,
              eventName,
            ),
          },
        ]
      : [],
  )
  if (!first?.payment) return null
  const hasSeveralPayers = payments.length > 1
  const total = payments.reduce((sum, { payment }) => sum + payment.summary.payableCzk, 0)

  return (
    <Card className="gap-4 p-4 sm:p-6">
      <h2 className="text-2xl font-semibold">{t("confirmation.payment.title")}</h2>
      <p className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">{t("confirmation.payment.total")}</span>
        <MoneyAmount
          className="text-2xl"
          amountCzk={total}
        />
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
        <PaymentCopyField
          label={t("confirmation.payment.account")}
          value={first.payment.bankAccount}
          copyLabel={t("common:clipboard.copyAccount")}
        />
        {payments.map(({ application, payment, spayd }) => (
          <PaymentCopyField
            key={application.variableSymbol}
            label={
              hasSeveralPayers
                ? t("confirmation.payment.variableSymbolOf", {
                    name: application.firstName,
                    amount: formatCzk(payment.summary.payableCzk),
                  })
                : t("confirmation.payment.variableSymbol")
            }
            value={payment.summary.variableSymbol}
            copyLabel={t("common:clipboard.copyVariableSymbol")}
          >
            {spayd && (
              <PaymentQrDownload
                key={spayd}
                spayd={spayd}
                variableSymbol={payment.summary.variableSymbol}
              />
            )}
          </PaymentCopyField>
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
      <p>{t("confirmation.payment.note")}</p>
    </Card>
  )
}

// Figma v2: "Jak se k přihlášce vrátíte" in 15751-1267 / 15314-2 (new account). The existing-account
// text keeps its story copy (V06), the frame draws only the new account.
function AccountCard({
  data,
  signedInParticipant,
}: {
  data: SubmissionStatusData
  signedInParticipant: SignedInParticipant | "loading" | null
}) {
  const { t } = useTranslation("applicationForm")
  const kind = data.isNewAccount ? "newAccount" : "existingAccount"
  const isSessionLoading = signedInParticipant === "loading"
  // A signed-in participant whose account owns the submission (same e-mail) is already in:
  // the link opens the application. Everyone else keeps the sign-in link (#318).
  const isOwner =
    !isSessionLoading && signedInParticipant?.email.toLowerCase() === data.email.toLowerCase()
  // Without a password the participant has to set one first, which always ends on the list of
  // applications — so the action says what it really does instead of promising the detail.
  const shouldSetPassword =
    isOwner && !isSessionLoading && signedInParticipant?.mustSetPassword === true
  const [onlyApplication] = data.applications
  const singleApplicationId = data.applications.length === 1 ? onlyApplication?.id : undefined

  return (
    <>
      <section className="flex flex-col gap-4 rounded-lg bg-secondary p-4">
        <h2 className="text-2xl font-semibold">{t("confirmation.account.title")}</h2>
        <p>{t(`confirmation.account.${kind}`, { email: data.email })}</p>
        {data.isNewAccount ? (
          <Alert>
            <AlertTitle>{t("confirmation.account.firstAccessTitle")}</AlertTitle>
            <AlertDescription>{t("confirmation.account.firstAccessText")}</AlertDescription>
          </Alert>
        ) : null}
        <p className="text-sm text-muted-foreground">{t("confirmation.account.noEmail")}</p>
      </section>
      {isSessionLoading ? null : (
        <Button
          asChild
          size="lg"
          className="w-full sm:w-fit"
        >
          {shouldSetPassword ? (
            <Link to={ROUTES.participant.setPassword}>{t("confirmation.account.setPassword")}</Link>
          ) : isOwner && singleApplicationId ? (
            <Link
              to={ROUTES.participant.application}
              params={{ applicationId: singleApplicationId }}
            >
              {t("confirmation.account.viewApplication")}
            </Link>
          ) : isOwner ? (
            <Link to={ROUTES.participant.applications}>
              {t("confirmation.account.viewApplications")}
            </Link>
          ) : (
            <Link to={ROUTES.participant.login}>{t(`confirmation.account.${kind}Action`)}</Link>
          )}
        </Button>
      )}
    </>
  )
}

// Figma v2: platební údaj po odeslání · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/?node-id=19034-13976
function PaymentCopyField({
  label,
  value,
  copyLabel,
  children,
}: {
  label: string
  value: string
  copyLabel: string
  children?: ReactNode
}) {
  const { t } = useTranslation("common")
  const [copiedValue, setCopiedValue] = useState<string | null>(null)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <dt className="text-sm font-medium">{label}</dt>
      <dd className="flex min-w-0 items-center gap-3">
        <span className="min-w-0 flex-1 rounded-control border border-field-border bg-card px-4 py-3 text-base break-all">
          {value}
        </span>
        <span className="grid size-12 shrink-0 place-items-center">
          <CopyButton
            value={value}
            label={copyLabel}
            onCopyResult={(didCopy) => setCopiedValue(didCopy ? value : null)}
          />
        </span>
      </dd>
      {copiedValue === value && (
        <dd
          aria-hidden="true"
          className="text-sm text-primary dark:text-link"
        >
          {t("clipboard.copiedField")}
        </dd>
      )}
      {children && <dd className="mt-2">{children}</dd>}
    </div>
  )
}
