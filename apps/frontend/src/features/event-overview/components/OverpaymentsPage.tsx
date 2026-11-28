import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { MoneyAmount } from "@/components/atoms/MoneyAmount"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { Pagination } from "@/components/molecules/Pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePagination } from "@/hooks/usePagination"
import { formatCzk } from "@/lib/money"
import { notify } from "@/lib/notify"
import { termDates, termTitle } from "@/lib/term-label"

import {
  overpaymentsQueryOptions,
  type Overpayment,
} from "@/features/event-overview/api/overpayments"
import {
  paymentQueryOptions,
  type PaymentApplication,
} from "@/features/event-overview/api/payments"
import { PaymentEditor, type RecordType } from "@/features/event-overview/components/PaymentEditor"

const ALL_TERMS = "all"

type TermOption = { id: string; name: string | null; startsOn: string; endsOn: string }

const rowKey = (entry: Pick<Overpayment, "applicationId" | "termId">) =>
  `${entry.applicationId}:${entry.termId}`

const normalizeSearch = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

// Figma (Design system v2): #371 Přehled nevrácených přeplatků · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=23402-93403 (360 px: 23402-93706)
// Figma (Design system v2): #371 Po částečné vratce 23402-93907 (360 px: 23402-94218), po úplné 23402-94427 (360 px: 23402-94721), prázdný stav 23402-94910 (360 px: 23402-95075)
export function OverpaymentsPage({
  eventId,
  eventName,
  terms,
}: {
  eventId: string
  eventName?: string
  terms: TermOption[]
}) {
  const { t } = useTranslation("eventOverview")
  const query = useQuery(overpaymentsQueryOptions(eventId))
  const [search, setSearch] = useState("")
  const [termId, setTermId] = useState(ALL_TERMS)
  const [editor, setEditor] = useState<Overpayment | null>(null)
  const [refundedKey, setRefundedKey] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(20)
  const entries = query.data ?? []
  const options = new Map(terms.map((term) => [term.id, term]))
  for (const entry of entries) {
    if (!options.has(entry.termId)) {
      options.set(entry.termId, {
        id: entry.termId,
        name: entry.termName,
        startsOn: entry.startsOn,
        endsOn: entry.endsOn,
      })
    }
  }
  const words = normalizeSearch(search.trim()).split(/\s+/).filter(Boolean)
  const exactSymbols = new Set(
    words.filter((word) => entries.some((entry) => entry.variableSymbol === word)),
  )
  const matches = entries.filter(
    (entry) =>
      (termId === ALL_TERMS || entry.termId === termId) &&
      words.every((word) =>
        exactSymbols.has(word)
          ? entry.variableSymbol === word
          : normalizeSearch(
              `${entry.firstName} ${entry.lastName} ${entry.variableSymbol}`,
            ).includes(word),
      ),
  )
  const total = entries.reduce((sum, entry) => sum + entry.amountCzk, 0)
  const selected = matches.reduce((sum, entry) => sum + entry.amountCzk, 0)
  const isFiltered = words.length > 0 || termId !== ALL_TERMS
  const pagination = usePagination(matches, JSON.stringify([search, termId, pageSize]), pageSize)
  const { pageItems } = pagination
  const openRefund = (entry: Overpayment) => {
    setRefundedKey(null)
    setEditor(entry)
  }
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <Seo title={t("overpayments.title")} />
      <div className="flex items-start gap-3 md:gap-4">
        <BackLink
          to={ROUTES.organizer.eventPayments}
          params={{ eventId }}
        >
          {t("overpayments.back")}
        </BackLink>
        <div className="flex min-w-0 flex-col gap-2 wrap-anywhere">
          <h2 className="text-2xl font-bold tracking-tight">{t("overpayments.title")}</h2>
          {eventName ? <p>{eventName}</p> : null}
        </div>
      </div>

      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          title={t("overpayments.error")}
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <Card className="gap-2 p-4">
            <AmountRow
              label={t("overpayments.total")}
              amount={total}
            />
            <p className="text-sm">
              {t("overpayments.totalScope", {
                count: new Set(entries.map((entry) => entry.applicationId)).size,
              })}
            </p>
          </Card>
          <div className="grid items-end gap-4 md:grid-cols-2">
            <div className="relative min-w-0">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                aria-label={t("overpayments.search")}
                placeholder={t("overpayments.search")}
                value={search}
                onChange={(event) => {
                  setRefundedKey(null)
                  setSearch(event.target.value)
                }}
                className="bg-card pl-11"
              />
            </div>
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="overpayments-term">{t("overpayments.term")}</Label>
              <Select
                value={termId}
                onValueChange={(value) => {
                  setRefundedKey(null)
                  setTermId(value)
                }}
              >
                <SelectTrigger
                  id="overpayments-term"
                  className="w-full bg-card"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TERMS}>{t("overpayments.allTerms")}</SelectItem>
                  {[...options.values()].map((term) => (
                    <SelectItem
                      key={term.id}
                      value={term.id}
                    >
                      {termTitle(term)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {entries.length > 0 || isFiltered ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p aria-live="polite">
                {t("overpayments.selection", {
                  count: matches.length,
                  amount: formatCzk(selected),
                })}
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setRefundedKey(null)
                  setSearch("")
                  setTermId(ALL_TERMS)
                }}
              >
                {t("overpayments.clear")}
              </Button>
            </div>
          ) : null}
          {matches.length > 0 ? (
            <>
              <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("overpayments.participant")}</TableHead>
                      <TableHead>{t("overpayments.term")}</TableHead>
                      <TableHead>{t("overpayments.status")}</TableHead>
                      <TableHead className="text-right">{t("overpayments.amount")}</TableHead>
                      <TableHead>{t("overpayments.variableSymbol")}</TableHead>
                      <TableHead>
                        <span className="sr-only">{t("overpayments.refund")}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((entry) => (
                      <TableRow
                        key={rowKey(entry)}
                        className={refundedKey === rowKey(entry) ? "bg-accent" : undefined}
                      >
                        <TableCell className="whitespace-normal">
                          <p className="wrap-anywhere">
                            {entry.firstName} {entry.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            #{entry.applicationNumber}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {entry.termName && <p>{entry.termName}</p>}
                          <p className="text-sm text-muted-foreground">{termDates(entry)}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={entry.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyAmount amountCzk={entry.amountCzk} />
                        </TableCell>
                        <TableCell>
                          {t("overpayments.symbol", { symbol: entry.variableSymbol })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <ApplicationLink
                              eventId={eventId}
                              entry={entry}
                            />
                            <Button
                              variant="ghost"
                              onClick={() => openRefund(entry)}
                            >
                              {t("overpayments.refund")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="flex flex-col gap-4 md:hidden">
                {pageItems.map((entry) => (
                  <li key={rowKey(entry)}>
                    <Card
                      className={
                        refundedKey === rowKey(entry) ? "gap-3 bg-accent p-4" : "gap-3 p-4"
                      }
                    >
                      <h3 className="text-xl font-bold wrap-anywhere">
                        {entry.firstName} {entry.lastName}
                      </h3>
                      <p>{[entry.termName, termDates(entry)].filter(Boolean).join(" · ")}</p>
                      <StatusBadge status={entry.status} />
                      <AmountRow
                        label={t("overpayments.remaining")}
                        amount={entry.amountCzk}
                      />
                      <p>{t("overpayments.symbol", { symbol: entry.variableSymbol })}</p>
                      <div className="flex flex-wrap gap-2">
                        <ApplicationLink
                          eventId={eventId}
                          entry={entry}
                          isMobile
                        />
                        <Button
                          size="lg"
                          onClick={() => openRefund(entry)}
                        >
                          {t("overpayments.refund")}
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
              <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <Pagination
                  {...pagination}
                  onPageChange={pagination.setPage}
                  shouldShowSinglePage
                />
                <div className="hidden md:block">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => setPageSize(Number(value))}
                  >
                    <SelectTrigger aria-label={t("overpayments.pageSize")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[20, 50, 100].map((size) => (
                        <SelectItem
                          key={size}
                          value={String(size)}
                        >
                          {t("overpayments.perPage", { size })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title={t(isFiltered ? "overpayments.noMatches" : "overpayments.emptyTitle")}
              message={isFiltered ? undefined : t("overpayments.emptyDescription")}
            />
          )}
        </>
      )}
      {editor ? (
        <RefundEditor
          entry={editor}
          onClose={() => setEditor(null)}
          onRecorded={(type, termId) => {
            if (type === "refund" && termId) {
              notify.success(t("overpayments.refundRecorded"))
              setRefundedKey(rowKey({ applicationId: editor.applicationId, termId }))
            }
          }}
        />
      ) : null}
    </section>
  )
}

function ApplicationLink({
  eventId,
  entry,
  isMobile = false,
}: {
  eventId: string
  entry: Overpayment
  isMobile?: boolean
}) {
  const { t } = useTranslation("eventOverview")
  return (
    <Button
      variant={isMobile ? "outline" : "ghost"}
      size={isMobile ? "lg" : "default"}
      asChild
    >
      <Link
        to={ROUTES.organizer.application}
        params={{ eventId, applicationId: entry.applicationId }}
        aria-label={t("overpayments.detailFor", { name: `${entry.firstName} ${entry.lastName}` })}
      >
        {t("overpayments.detail")}
      </Link>
    </Button>
  )
}

function AmountRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <MoneyAmount
        amountCzk={amount}
        className="shrink-0 text-2xl font-medium"
      />
    </div>
  )
}

function StatusBadge({ status }: { status: Overpayment["status"] }) {
  const { t } = useTranslation("eventOverview")
  return (
    <Badge
      variant={
        status === "CONFIRMED" ? "positive" : status === "WAITLISTED" ? "warning" : "neutral"
      }
    >
      {t(`termStatus.state.${status}`)}
    </Badge>
  )
}

function RefundEditor({
  entry,
  onClose,
  onRecorded,
}: {
  entry: Overpayment
  onClose: () => void
  onRecorded: (type: RecordType, termId?: string) => void
}) {
  const { t } = useTranslation("eventOverview")
  const query = useQuery({ ...paymentQueryOptions(entry.applicationId), refetchOnMount: "always" })
  // Seed the form only from a fresh response. Keep its mutation state mounted while
  // later refetches update the limit, including when the refund removes the overpayment.
  const [initialData, setInitialData] = useState<PaymentApplication | null>(null)
  const term = query.data?.terms.find((item) => item.termId === entry.termId)
  if (
    !initialData &&
    query.isFetchedAfterMount &&
    query.isSuccess &&
    term &&
    term.refundableCzk > 0
  ) {
    setInitialData(query.data)
  }
  if (initialData) {
    return (
      <PaymentEditor
        application={query.data ?? initialData}
        term={initialData.terms.find((item) => item.termId === entry.termId)}
        initialType="refund"
        onClose={onClose}
        onRecorded={onRecorded}
      />
    )
  }
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>{t("payment.refundTitle")}</DialogTitle>
        {!query.isFetchedAfterMount || query.isFetching ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState
            title={t("overpayments.error")}
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <p>{t("payment.refundUnavailableHint")}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
