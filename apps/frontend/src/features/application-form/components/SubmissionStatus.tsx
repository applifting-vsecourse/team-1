import type { ReactNode } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Check, Clock, Hourglass, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import ConfirmedIllustration from "@/assets/illustrations/confirmed.svg?react"
import WaitingIllustration from "@/assets/illustrations/waiting.svg?react"
import { CopyButton } from "@/components/atoms/CopyButton"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Sticker } from "@/components/atoms/Sticker"
import { PaymentQrDownload } from "@/components/molecules/PaymentQrDownload"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDateRange } from "@/lib/date"
import { summaryPaymentSpayd } from "@/lib/payment-qr"
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
   * `"loading"` while the session is still being read — the action in the account block
   * waits for it, so a signed-in applicant never sees the sign-in link first.
   */
  signedInParticipant?: SignedInParticipant | "loading" | null
}

export type SignedInParticipant = { email: string; mustSetPassword: boolean }

type TermStatus = SubmittedApplication["terms"][number]["status"]

/** One state block per state the submission holds, in this order (Figma: Submission state). */
const STATES = {
  CONFIRMED: {
    key: "confirmed",
    surface: "bg-status-success-bg",
    mark: "bg-status-success text-card",
    Icon: Check,
  },
  TO_EVALUATE: {
    key: "toEvaluate",
    surface: "bg-wash",
    mark: "border border-border bg-card text-muted-foreground",
    Icon: Hourglass,
  },
  WAITLISTED: {
    key: "waitlisted",
    surface: "bg-status-waitlist-bg",
    mark: "bg-card text-status-waitlist",
    Icon: Clock,
  },
} as const satisfies Partial<
  Record<
    TermStatus,
    {
      key: "confirmed" | "toEvaluate" | "waitlisted"
      surface: string
      mark: string
      Icon: LucideIcon
    }
  >
>

/**
 * The page right after sending, one 800 px column: what happened (one block per state), a summary
 * per participant with the term states and — for a confirmed term — what to pay and where, and how
 * the applicant gets back. A waitlisted term is never given a place in line (docs/PROJEKT.md, 2026-10-21).
 * Only a confirmed place is celebrated (Luma, Cal.com): the camp assembles (M31) and the sticker
 * sticks (M32); otherwise the waiting camp stays still and only the check by the heading draws (M04).
 */
// Figma v2: K vyhodnocení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15751-1267 (360 px: 15751-1297)
// Figma v2: Potvrzené termíny · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15314-2 (360 px: 15314-42)
// Figma v2: Potvrzený i náhradník · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15546-11026 (360 px: 15546-11084)
// Figma v2: Vše náhradník · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15546-11142 (360 px: 15546-11172)
export function SubmissionStatus({
  accessToken,
  signedInParticipant = null,
}: SubmissionStatusProps) {
  const { t } = useTranslation("applicationForm")
  const { data } = useSuspenseQuery(submissionStatusQueryOptions(accessToken))
  if (data.applications.length === 0) return null
  const statuses = new Set(
    data.applications.flatMap((application) => application.terms.map((term) => term.status)),
  )
  const states = (["CONFIRMED", "TO_EVALUATE", "WAITLISTED"] as const).filter((status) =>
    statuses.has(status),
  )
  const hasConfirmedTerm = statuses.has("CONFIRMED")

  return (
    <div className="px-4 pt-6 pb-16 md:px-6 md:pt-12">
      <div className="mx-auto flex w-full max-w-200 flex-col gap-6">
        <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight md:text-[32px]/10">
                {t("confirmation.title")}
              </h1>
              {hasConfirmedTerm ? null : (
                <Check
                  aria-hidden
                  className="saved-mark size-8 shrink-0 text-primary"
                />
              )}
            </div>
            <p className="text-muted-foreground">
              {t("confirmation.subtitle", { event: data.eventName, email: data.email })}
            </p>
          </div>
          <Celebration hasConfirmedTerm={hasConfirmedTerm} />
        </div>

        {states.map((status) => (
          <SubmissionState
            key={status}
            status={status}
          />
        ))}

        {data.applications.map((application) => (
          <ApplicationSummary
            key={application.id}
            application={application}
            eventName={data.eventName}
          />
        ))}

        <AccountBlock
          data={data}
          signedInParticipant={signedInParticipant}
        />
      </div>
    </div>
  )
}

/** Decoration only: the state is always in the text next to it. */
// Figma (Design system v2): Oslava · M31 + M32 in 15314-2; Ilustrace · Čekání (statická) in 15751-1267
function Celebration({ hasConfirmedTerm }: { hasConfirmedTerm: boolean }) {
  const { t } = useTranslation("applicationForm")
  if (!hasConfirmedTerm) {
    return <WaitingIllustration className="h-auto w-40 shrink-0 sm:w-50" />
  }
  return (
    <div
      aria-hidden
      className="brand-assemble relative w-40 shrink-0 sm:w-50"
    >
      <ConfirmedIllustration className="h-auto w-full" />
      <Sticker
        label={t("confirmation.sticker")}
        isAnimated
        className="absolute top-[68%] left-[36%]"
      />
    </div>
  )
}

// Figma (Design system v2): Togena / Registration / Submission state · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27437-3711
function SubmissionState({ status }: { status: keyof typeof STATES }) {
  const { t } = useTranslation("applicationForm")
  const { key, surface, mark, Icon } = STATES[status]
  return (
    <section className={cn("flex items-start gap-3 rounded-lg p-4", surface)}>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", mark)}>
        <Icon
          aria-hidden
          className="size-5"
        />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-xl font-bold">{t(`confirmation.state.${key}.title`)}</h2>
        <p>{t(`confirmation.state.${key}.text`)}</p>
      </div>
    </section>
  )
}

const BADGES = {
  CONFIRMED: { variant: "positive", label: "confirmation.status.confirmed" },
  TO_EVALUATE: { variant: "neutral", label: "confirmation.status.toEvaluate" },
  WAITLISTED: { variant: "waitlist", label: "confirmation.status.waitlisted" },
  CANCELLED: { variant: "inactive", label: "confirmation.status.cancelled" },
  ARCHIVED: { variant: "inactive", label: "confirmation.status.archived" },
} as const satisfies Record<TermStatus, unknown>

/**
 * One participant's application (Cal.com What / When): the terms with their states and, once a
 * term is confirmed, the summary variable symbol of the application with the account and the QR.
 * Applications are paid separately (issue #153), so every participant has their own block.
 */
function ApplicationSummary({
  application,
  eventName,
}: {
  application: SubmittedApplication
  eventName: string
}) {
  const { t } = useTranslation(["applicationForm", "common"])
  const { payment } = application

  return (
    <Card className="gap-0 px-4 py-2">
      <dl className="flex flex-col">
        <SummaryRow label={t("confirmation.summary.participant")}>
          {t("confirmation.summary.participantValue", {
            name: `${application.firstName} ${application.lastName}`,
            code: application.code,
          })}
        </SummaryRow>
        {application.terms.map((term, index) => {
          const badge = BADGES[term.status]
          return (
            <SummaryRow
              key={term.termId}
              label={t("confirmation.summary.term")}
              isLabelHidden={index > 0}
              aside={<Badge variant={badge.variant}>{t(badge.label)}</Badge>}
            >
              {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
            </SummaryRow>
          )
        })}
        {payment ? (
          <>
            <SummaryRow label={t("confirmation.summary.amountDue")}>
              <MoneyAmount
                className="text-xl font-bold"
                amountCzk={payment.summary.payableCzk}
              />
            </SummaryRow>
            <SummaryRow
              label={t("confirmation.summary.variableSymbol")}
              aside={
                <CopyButton
                  value={payment.summary.variableSymbol}
                  label={t("common:clipboard.copyVariableSymbol")}
                />
              }
            >
              {payment.summary.variableSymbol}
            </SummaryRow>
            <SummaryRow
              label={t("confirmation.summary.bankAccount")}
              aside={
                <CopyButton
                  value={payment.bankAccount}
                  label={t("common:clipboard.copyAccount")}
                />
              }
            >
              {payment.bankAccount}
            </SummaryRow>
            <SummaryRow label={t("confirmation.summary.qr")}>
              <PaymentQrDownload
                layout="inline"
                spayd={summaryPaymentSpayd(
                  payment.bankAccount,
                  payment.summary.payableCzk,
                  payment.summary.variableSymbol,
                  eventName,
                )}
                variableSymbol={payment.summary.variableSymbol}
              />
            </SummaryRow>
          </>
        ) : null}
      </dl>
    </Card>
  )
}

// Figma (Design system v2): Togena / Registration / Summary row · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27437-3740
// The label sits left of the value from `sm`, above it on a phone; rows are split by a hairline.
function SummaryRow({
  label,
  isLabelHidden = false,
  aside,
  children,
}: {
  label: string
  /** The next term under the first one: the label is read, not shown; the value keeps its column. */
  isLabelHidden?: boolean
  /** A state badge or the copy action at the end of the row. */
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-border py-2 first:border-t-0 sm:flex-row sm:items-center sm:gap-4">
      <dt
        className={cn(
          "text-sm text-muted-foreground sm:w-44 sm:shrink-0",
          isLabelHidden && "sr-only",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "flex min-h-8 w-full min-w-0 items-center gap-3",
          // w-44 of the label + gap-4
          isLabelHidden && "sm:pl-48",
        )}
      >
        <span className="min-w-0 flex-1 break-words">{children}</span>
        {aside}
      </dd>
    </div>
  )
}

// Figma v2: "Jak se k přihlášce vrátíte" in 15751-1267 / 15314-2 (new account). The existing-account
// text keeps its story copy (V06), the frame draws only the new account.
function AccountBlock({
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
    <section className="flex flex-col items-start gap-2 rounded-lg border border-border-strong bg-wash p-4">
      <h2 className="text-xl font-bold">{t("confirmation.account.title")}</h2>
      <p>{t(`confirmation.account.${kind}`, { email: data.email })}</p>
      <p className="text-sm text-muted-foreground">{t("confirmation.account.noEmail")}</p>
      {isSessionLoading ? null : (
        <Button
          asChild
          variant="outline"
          size="lg"
          className="min-w-55"
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
    </section>
  )
}
