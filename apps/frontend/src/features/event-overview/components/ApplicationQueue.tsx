import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { LogoSymbol } from "@/components/atoms/Logo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateRange } from "@/lib/date"

import { applicationsQueryOptions } from "@/features/event-overview/api/applications"
import { BulkConfirmDialog } from "@/features/event-overview/components/BulkConfirmDialog"
import { QueueRow } from "@/features/event-overview/components/QueueRow"
import type { ApplicationsSearch } from "@/features/event-overview/lib/applications-search"
import type { BulkResultView } from "@/features/event-overview/lib/bulk-result"

// Figma (Design system): US-103 Přihlášky · Fronta od nejstarších · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-4897 (mobile 15765-5018)
// Figma (Design system): US-103 Přihlášky · Chyba fronty · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-5561 (mobile 15765-5636)
// Figma (Design system): US-103 Přihlášky · Filtr termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-5112 (mobile 15765-5231)
// Figma (Design system): US-103 Přihlášky · Fronta prázdná · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-5323 (mobile 15765-5391)
// Figma (Design system): US-107 Přihlášky · Vybrané přihlášky · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15803-15850 (mobile 15803-16041)
// Figma (Design system): US-103 Přihlášky · Načítání fronty · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15765-5432 (mobile 15765-5510)
export function ApplicationQueue({
  eventId,
  filters,
  terms,
  onFiltersChange,
  onBulkDone,
}: {
  eventId: string
  filters: ApplicationsSearch
  terms: { id: string; startsOn: string; endsOn: string }[]
  onFiltersChange: (filters: ApplicationsSearch) => void
  onBulkDone: (result: BulkResultView) => void
}) {
  const { t } = useTranslation("eventOverview")
  const searchInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (searchInput.current) searchInput.current.value = filters.q ?? ""
  }, [filters.q])
  const query = useQuery(applicationsQueryOptions(eventId, filters))
  // Selecting is per term (US-107): the free beds that decide a confirmation belong to one term.
  const term = terms.find((candidate) => candidate.id === filters.term)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const rows = query.data ?? []
  // Only what the filter shows counts, so narrowing the filter never confirms a hidden row.
  const selected = term ? rows.filter((row) => selectedIds.has(row.id)) : []
  const isAllSelected = rows.length > 0 && selected.length === rows.length
  return (
    <>
      <p>{t("queue.sortHint")}</p>
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <form
          role="search"
          aria-label={t("queue.search")}
          className="relative md:w-80"
          onSubmit={(event) => event.preventDefault()}
        >
          <Label
            className="sr-only"
            htmlFor="queue-search"
          >
            {t("queue.search")}
          </Label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-4 size-5 text-muted-foreground"
          />
          <Input
            ref={searchInput}
            id="queue-search"
            name="q"
            type="search"
            maxLength={100}
            defaultValue={filters.q ?? ""}
            placeholder={t("queue.search")}
            className="pl-12"
            onChange={(event) => {
              const q = event.target.value.trim()
              onFiltersChange({ ...filters, q: q === "" ? undefined : q })
            }}
          />
        </form>
        <div className="flex min-w-0 flex-col gap-2 md:flex-1">
          <Label htmlFor="queue-term">{t("applications.term")}</Label>
          <Select
            value={filters.term ?? "all"}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, term: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger
              id="queue-term"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("applications.allTerms")}</SelectItem>
              {terms.map((term) => (
                <SelectItem
                  key={term.id}
                  value={term.id}
                >
                  {formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {query.isPending ? (
        <div
          role="status"
          className="flex flex-col gap-4 rounded-2xl border bg-card p-6"
        >
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="flex items-center gap-3"
              aria-hidden="true"
            >
              <Skeleton className="size-10 shrink-0 rounded-full bg-border" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-full bg-border" />
                <Skeleton className="h-3 w-full bg-border" />
              </div>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">{t("queue.loading")}</p>
        </div>
      ) : query.isError ? (
        <div className="flex flex-col gap-6">
          <Alert
            variant="destructive"
            className="items-center rounded-2xl border-destructive bg-card px-4 py-4 has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] *:data-[slot=alert-description]:text-muted-foreground [&>svg]:size-5 [&>svg]:translate-y-0 [&>svg]:self-center"
          >
            <TriangleAlert aria-hidden="true" />
            <AlertTitle className="line-clamp-none font-medium tracking-normal">
              {t("queue.error")}
            </AlertTitle>
            <AlertDescription>{t("queue.errorHint")}</AlertDescription>
          </Alert>
          <Button
            className="h-12 w-full rounded-xl"
            onClick={() => void query.refetch()}
          >
            {t("queue.retry")}
          </Button>
        </div>
      ) : query.data.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          {filters.q ? (
            <p className="text-sm text-muted-foreground">{t("applications.empty")}</p>
          ) : (
            <>
              <LogoSymbol className="size-14 text-primary" />
              <h2 className="text-2xl font-semibold tracking-tight">{t("queue.empty")}</h2>
              <p className="text-base text-muted-foreground">{t("queue.emptyHint")}</p>
            </>
          )}
        </div>
      ) : (
        <>
          {term && (
            <>
              <p>
                {t("bulk.termStatus", {
                  term: formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }),
                })}
              </p>
              <div className="flex items-center gap-3 py-2">
                <Checkbox
                  id="queue-select-all"
                  className="size-6 rounded-md"
                  checked={isAllSelected}
                  onCheckedChange={(checked) =>
                    setSelectedIds(
                      checked === true ? new Set(rows.map((row) => row.id)) : new Set(),
                    )
                  }
                />
                <Label
                  htmlFor="queue-select-all"
                  className="text-base font-normal"
                >
                  {t("bulk.selectAll", { count: rows.length })}
                </Label>
              </div>
            </>
          )}
          {term && selected.length > 0 && (
            <div className="sticky bottom-0 z-20 order-last bg-background pt-3 pb-4 md:static md:order-none md:bg-transparent md:p-0">
              <div className="flex flex-col gap-3 rounded-xl bg-accent p-4">
                <div className="flex items-start gap-3">
                  <p className="w-8 text-sm font-medium text-primary">{selected.length}</p>
                  <p>{t("bulk.selection")}</p>
                </div>
                <div className="flex flex-col gap-3 md:flex-row">
                  <Button
                    variant="outline"
                    size="lg"
                    className="md:w-55"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    {t("bulk.confirm")}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="md:w-55"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    {t("bulk.clear")}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <ul
            aria-busy={query.isFetching}
            className="flex flex-col gap-4"
          >
            {rows.map((row) => (
              <li key={row.id}>
                <QueueRow
                  eventId={eventId}
                  application={row}
                  termId={filters.term}
                  selection={
                    term
                      ? {
                          isSelected: selectedIds.has(row.id),
                          onChange: (isSelected) =>
                            setSelectedIds((current) => {
                              const next = new Set(current)
                              if (isSelected) next.add(row.id)
                              else next.delete(row.id)
                              return next
                            }),
                        }
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
      {term && isDialogOpen && (
        <BulkConfirmDialog
          eventId={eventId}
          term={term}
          applications={selected}
          onClose={() => setIsDialogOpen(false)}
          onDone={onBulkDone}
        />
      )}
    </>
  )
}
