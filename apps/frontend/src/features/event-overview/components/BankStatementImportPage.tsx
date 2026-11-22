import { Fragment, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Download } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { UploadField } from "@/components/molecules/UploadField"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/date"
import { formatCurrencyAmount } from "@/lib/money"
import { notify } from "@/lib/notify"

import {
  unmatchedTransactionsKey,
  unmatchedTransactionsQueryOptions,
  uploadBankStatement,
  type StatementImportResult,
} from "@/features/event-overview/api/bankStatements"
import { UnmatchedTransactionPanel } from "@/features/event-overview/components/UnmatchedTransactionPanel"
import { downloadCsv, resultFileName } from "@/features/event-overview/lib/download-csv"

const MAX_STATEMENT_BYTES = 2 * 1024 * 1024

// Design proposal (US-42), no Figma frame exists yet; the structure and copy still need the designer's review.
// Based on Figma (Design system): #45 Platby · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=19786-51878
// Upload field (Togena / Upload) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15207-1978
export function BankStatementImportPage({
  eventId,
  eventName,
}: {
  eventId: string
  eventName?: string
}) {
  const { t } = useTranslation("eventOverview")
  const queryClient = useQueryClient()
  const [result, setResult] = useState<{
    data: StatementImportResult
    fileName: string
  } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: (file: File) => uploadBankStatement(eventId, file),
    onSuccess: async (data, file) => {
      setUploadError(null)
      setResult({ data, fileName: resultFileName(file.name) })
      notify.success(t("bankStatement.done"))
      await queryClient.invalidateQueries({ queryKey: unmatchedTransactionsKey(eventId) })
      await queryClient.invalidateQueries({ queryKey: ["eventOverview", "payments"] })
    },
    onError: (error) => setUploadError(error.message),
  })

  return (
    <section className="flex flex-col gap-6">
      <Seo title={t("bankStatement.title")} />
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">{t("bankStatement.title")}</h2>
        {eventName ? <p>{eventName}</p> : null}
        <p className="text-muted-foreground">{t("bankStatement.description")}</p>
        <Button
          asChild
          variant="ghost"
          size="lg"
          className="self-start"
        >
          <Link
            to={ROUTES.organizer.eventPayments}
            params={{ eventId }}
          >
            {t("bankStatement.back")}
          </Link>
        </Button>
      </div>
      <UploadField
        title={t("bankStatement.upload.title")}
        description={t("bankStatement.upload.description")}
        buttonLabel={t(
          upload.isPending ? "bankStatement.upload.sending" : "bankStatement.upload.button",
        )}
        note={t("bankStatement.upload.note")}
        accept=".csv,text/csv,text/plain"
        isDisabled={upload.isPending}
        error={uploadError}
        onSelect={(file) => {
          if (file.size > MAX_STATEMENT_BYTES) {
            setUploadError(t("bankStatement.upload.tooLarge"))
            return
          }
          upload.mutate(file)
        }}
      />
      {result ? (
        <ImportSummary
          result={result.data}
          fileName={result.fileName}
        />
      ) : null}
      <UnmatchedTransactions eventId={eventId} />
    </section>
  )
}

function ImportSummary({ result, fileName }: { result: StatementImportResult; fileName: string }) {
  const { t } = useTranslation("eventOverview")
  const cards = [
    {
      key: "matched",
      amountCzk: result.matchedCzk,
      count: result.matchedCount,
    },
    {
      key: "unmatched",
      amountCzk: Math.round(result.unmatchedCzk),
      count: result.unmatchedCount,
    },
    {
      key: "overpaid",
      amountCzk: result.overpaidCzk,
      count: result.overpaidCount,
    },
  ] as const
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card
            key={card.key}
            className="gap-2 p-4"
          >
            <p className="flex items-baseline justify-between gap-4">
              <span>{t(`bankStatement.result.${card.key}`)}</span>
              <MoneyAmount
                amountCzk={card.amountCzk}
                className="text-xl font-semibold"
              />
            </p>
            <p className="text-muted-foreground">
              {t("bankStatement.result.payments", { count: card.count })}
            </p>
          </Card>
        ))}
      </div>
      {result.duplicateCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("bankStatement.result.duplicates", { count: result.duplicateCount })}
        </p>
      ) : null}
      {result.ignoredCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("bankStatement.result.ignored", { count: result.ignoredCount })}
        </p>
      ) : null}
      <Button
        variant="outline"
        size="lg"
        className="self-start"
        onClick={() => downloadCsv(fileName, result.annotatedCsv)}
      >
        <Download aria-hidden />
        {t("bankStatement.result.download")}
      </Button>
    </div>
  )
}

// Figma (Design system): Návrh #562 varianta A · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27229-7536 (360 px: 27229-8929)
function UnmatchedTransactions({ eventId }: { eventId: string }) {
  const { t } = useTranslation("eventOverview")
  const [openId, setOpenId] = useState<string | null>(null)
  const { data, isPending, error, refetch } = useQuery(unmatchedTransactionsQueryOptions(eventId))
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl font-semibold tracking-tight">
        {t("bankStatement.unmatchedList.title")}
      </h3>
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState
          title={t("bankStatement.unmatchedList.error")}
          error={error}
          onRetry={() => void refetch()}
        />
      ) : data.transactions.length === 0 ? (
        <EmptyState message={t("bankStatement.unmatchedList.empty")} />
      ) : (
        // Below md the rows stack into cards (no sideways scroll).
        <div className="rounded-lg border bg-card">
          <Table className="md:min-w-190">
            <caption className="sr-only">{t("bankStatement.unmatchedList.list")}</caption>
            <TableHeader className="bg-muted max-md:sr-only">
              <TableRow>
                <TableHead className="h-12 px-4">{t("bankStatement.unmatchedList.date")}</TableHead>
                <TableHead className="px-4">
                  {t("bankStatement.unmatchedList.variableSymbol")}
                </TableHead>
                <TableHead className="px-4">{t("bankStatement.unmatchedList.amount")}</TableHead>
                <TableHead className="px-4">{t("bankStatement.unmatchedList.payer")}</TableHead>
                <TableHead className="px-4">{t("bankStatement.unmatchedList.reason")}</TableHead>
                <TableHead className="px-4">
                  <span className="sr-only">{t("bankStatement.unmatchedList.application")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {data.transactions.map((row) => {
                const isOpen = openId === row.id
                // Only a payment in whole crowns can be assigned by hand.
                const isAssignable = row.currency === "CZK" && row.amountCents % 100 === 0
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className={
                        isOpen
                          ? "bg-accent hover:bg-accent max-md:flex max-md:flex-col"
                          : "max-md:flex max-md:flex-col"
                      }
                    >
                      <TableCell className="px-4 py-4">{formatDate(row.bookedOn)}</TableCell>
                      <TableCell className="px-4 py-4">{row.variableSymbol ?? "–"}</TableCell>
                      <TableCell className="px-4 py-4">
                        {/* Cents stay visible: a statement amount is not rounded to whole crowns. */}
                        <span className="whitespace-nowrap tabular-nums">
                          {formatCurrencyAmount(row.amountCents / 100, row.currency)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-4 whitespace-normal">
                        {row.counterpartyName}
                        {row.message ? (
                          <span className="block text-muted-foreground">{row.message}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-4 py-4 whitespace-normal">
                        {t(`bankStatement.unmatchedList.reasons.${row.reason}`)}
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        {isAssignable && !isOpen ? (
                          <Button
                            variant="outline"
                            onClick={() => setOpenId(row.id)}
                            aria-label={`${t("bankStatement.unmatchedList.assign")} ${row.counterpartyName ?? row.variableSymbol ?? ""}`.trim()}
                          >
                            {t("bankStatement.unmatchedList.assign")}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {isOpen ? (
                      <TableRow className="hover:bg-transparent max-md:block">
                        <TableCell
                          colSpan={6}
                          className="px-4 py-6 whitespace-normal"
                        >
                          <UnmatchedTransactionPanel
                            eventId={eventId}
                            transaction={row}
                            onClose={() =>
                              setOpenId((current) => (current === row.id ? null : current))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
