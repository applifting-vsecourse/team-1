import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { CopyButton } from "@/components/atoms/CopyButton"
import { PaymentQrDownload } from "@/components/molecules/PaymentQrDownload"
import { TaskCard } from "@/components/molecules/TaskCard"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/date"
import { formatCzk } from "@/lib/money"
import { summaryPaymentSpayd } from "@/lib/payment-qr"
import { termTitle } from "@/lib/term-label"

import type { MyApplication } from "@/features/participant/api/applications"
import { SimulatePaymentButton } from "@/features/participant/components/SimulatePaymentButton"
import { paymentTask, type PaymentTask } from "@/features/participant/lib/payment-task"

/**
 * „Co zbývá zařídit“: what the applicant still has to do, each thing once. The debt with the
 * account, the summary variable symbol and the QR code, then a transport to choose for each
 * confirmed term. Nothing is drawn when nothing is left.
 */
// Figma (Design system v2): brand-slot · to-do · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27649-35075 (360 px: 24910-14762)
export function ApplicationTasks({ application }: { application: MyApplication }) {
  const { t } = useTranslation("participant")
  const payment = paymentTask(application)
  // After the term is over the choice can no longer be changed, so the task is gone (D-192).
  const transport = application.terms.filter(
    (term) =>
      term.status === "CONFIRMED" &&
      term.transportOffered &&
      term.termEditable &&
      !term.transportDecided,
  )
  if (!payment && transport.length === 0) return null

  return (
    <TaskCard
      role="region"
      aria-labelledby="application-tasks"
    >
      <h2
        id="application-tasks"
        className="font-semibold"
      >
        {t("detail.tasks.title")}
      </h2>
      {payment ? (
        <PaymentTaskBlock
          application={application}
          task={payment}
        />
      ) : null}
      {transport.map((term) => (
        <Link
          key={term.termId}
          to={ROUTES.participant.applicationTransport}
          hash={`transport-${term.termId}`}
          params={{ applicationId: application.id }}
          className="flex items-center gap-4 border-t pt-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-medium">{t("detail.tasks.transport")}</span>
            <span className="text-sm text-muted-foreground">{termTitle(term)}</span>
          </span>
          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-muted-foreground"
          />
        </Link>
      ))}
    </TaskCard>
  )
}

function PaymentTaskBlock({
  application,
  task,
}: {
  application: MyApplication
  task: PaymentTask
}) {
  const { t } = useTranslation(["participant", "common"])
  const [isQrOpen, setIsQrOpen] = useState(false)
  const details = application.paymentDetails!
  const variableSymbol = details.summary.variableSymbol
  const spayd = summaryPaymentSpayd(
    details.bankAccount,
    task.amountCzk,
    variableSymbol,
    application.eventName,
  )
  const owed = details.terms.filter(({ owedCzk }) => owedCzk > 0)

  return (
    // A grid: on a phone the QR button comes after the account and the symbol (Figma 27649:35259),
    // from `sm` it stands next to the task.
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-medium">
          {t("detail.tasks.pay", { amount: formatCzk(task.amountCzk) })}
        </p>
        <p className="text-sm text-muted-foreground">
          {[
            ...task.terms.map(termTitle),
            task.deadline ? t("list.dueOn", { date: formatDate(task.deadline) }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <dl className="flex flex-col divide-y border-t sm:col-span-2">
        {[
          {
            label: t("payment.account"),
            value: details.bankAccount,
            copy: t("common:clipboard.copyAccount"),
          },
          {
            label: t("payment.variableSymbol"),
            value: variableSymbol,
            copy: t("common:clipboard.copyVariableSymbol"),
          },
        ].map(({ label, value, copy }) => (
          <div
            key={label}
            className="flex flex-col gap-x-4 py-2 sm:flex-row sm:items-center"
          >
            <dt className="text-sm text-muted-foreground sm:w-46 sm:shrink-0">{label}</dt>
            <dd className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="min-w-0 break-all">{value}</span>
              <CopyButton
                value={value}
                label={copy}
              />
            </dd>
          </div>
        ))}
      </dl>
      {details.terms.some(({ owedCzk }) => owedCzk < 0) ? (
        <p className="text-sm sm:col-span-2">{t("payment.overpaymentNotTransferred")}</p>
      ) : null}
      {application.canSimulatePayment && owed.length > 0 ? (
        <div className="flex flex-col gap-3 sm:col-span-2">
          {owed.map((payment) => {
            const term = application.terms.find(({ termId }) => termId === payment.termId)
            return (
              <SimulatePaymentButton
                key={payment.termId}
                applicationId={application.id}
                termId={payment.termId}
                amountCzk={payment.owedCzk}
                termLabel={owed.length > 1 && term ? termTitle(term) : undefined}
              />
            )
          })}
        </div>
      ) : null}
      {spayd ? (
        <Button
          className="w-55 max-w-full sm:col-start-2 sm:row-start-1"
          aria-expanded={isQrOpen}
          onClick={() => setIsQrOpen((isOpen) => !isOpen)}
        >
          {t(isQrOpen ? "detail.tasks.hideQr" : "detail.tasks.showQr")}
        </Button>
      ) : null}
      {isQrOpen ? (
        <div className="sm:col-span-2">
          <PaymentQrDownload
            spayd={spayd}
            variableSymbol={variableSymbol}
          />
        </div>
      ) : null}
    </div>
  )
}
