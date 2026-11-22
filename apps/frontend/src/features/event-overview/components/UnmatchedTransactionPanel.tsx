import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PendingButton } from "@/components/atoms/PendingButton"
import { LoadingState } from "@/components/molecules/LoadingState"
import { TermLabel } from "@/components/molecules/TermLabel"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { formatCzk } from "@/lib/money"
import { notify } from "@/lib/notify"
import { termTitle } from "@/lib/term-label"

import {
  applicationCandidatesQueryOptions,
  matchTransaction,
  unmatchedTransactionsKey,
  type UnmatchedTransaction,
} from "@/features/event-overview/api/bankStatements"
import { afterAssignment, preselectedTermId } from "@/features/event-overview/lib/assignment"

const SEARCH_DELAY_MS = 250
const choiceOf = (applicationId: string, termId: string) => `${applicationId}:${termId}`

/**
 * The row of an unmatched transaction opened for the manual match (US-562): search an application,
 * choose one of its terms, see what the payment does, assign it.
 */
// Figma (Design system): Návrh #562 varianta A · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=27229-7536 (360 px: 27229-8929)
export function UnmatchedTransactionPanel({
  eventId,
  transaction,
  onClose,
}: {
  eventId: string
  transaction: UnmatchedTransaction
  onClose: () => void
}) {
  const { t } = useTranslation("eventOverview")
  const queryClient = useQueryClient()
  // A symbol that already points to an application starts the search with it.
  const [text, setText] = useState(
    transaction.applicationId ? (transaction.variableSymbol ?? "") : "",
  )
  const [query, setQuery] = useState(text.trim())
  const [chosen, setChosen] = useState<string | null>(null)
  const [isChoiceMissing, setIsChoiceMissing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [text])

  const candidates = useQuery({
    ...applicationCandidatesQueryOptions(eventId, query),
    enabled: query !== "",
  })
  const found = query === "" ? [] : (candidates.data ?? [])

  // The choice of the organizer, else the term the symbol points to or the only one there is.
  const fallback = (() => {
    const hit =
      found.find((candidate) => candidate.id === transaction.applicationId) ??
      (found.length === 1 ? found[0] : undefined)
    const termId = hit ? preselectedTermId(hit.terms, transaction.variableSymbol) : null
    return hit && termId ? choiceOf(hit.id, termId) : null
  })()
  const selected = chosen ?? fallback
  const selection = found
    .flatMap((candidate) => candidate.terms.map((term) => ({ candidate, term })))
    .find(({ candidate, term }) => choiceOf(candidate.id, term.termId) === selected)

  const amountCzk = transaction.amountCents / 100
  const after = selection
    ? afterAssignment({
        paidCzk: selection.term.paidCzk,
        owedCzk: selection.term.owedCzk,
        amountCzk,
      })
    : null

  const assign = useMutation({
    mutationFn: () =>
      matchTransaction(eventId, transaction.id, selection!.candidate.id, selection!.term.termId),
    onSuccess: async () => {
      notify.success(
        t("bankStatement.unmatchedList.assigned"),
        `${selection!.candidate.firstName} ${selection!.candidate.lastName} · ${termTitle(selection!.term)}`,
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: unmatchedTransactionsKey(eventId) }),
        queryClient.invalidateQueries({ queryKey: ["eventOverview"] }),
      ])
      onClose()
    },
  })

  const searchId = `assign-search-${transaction.id}`
  return (
    <form
      className="flex max-w-lg flex-col gap-4 md:ml-[calc(25%)]"
      onSubmit={(event) => {
        event.preventDefault()
        if (selection) assign.mutate()
        else setIsChoiceMissing(true)
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={searchId}>{t("bankStatement.unmatchedList.searchLabel")}</Label>
        <div className="relative">
          <Search
            aria-hidden
            className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={searchId}
            className="h-11 pl-10"
            value={text}
            placeholder={t("bankStatement.unmatchedList.searchPlaceholder")}
            onChange={(event) => setText(event.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
      {query === "" ? null : candidates.isPending ? (
        <LoadingState />
      ) : candidates.error ? (
        <Alert variant="destructive">
          <AlertDescription>{candidates.error.message}</AlertDescription>
        </Alert>
      ) : found.length === 0 ? (
        <p className="text-muted-foreground">{t("bankStatement.unmatchedList.noResults")}</p>
      ) : (
        <RadioGroup
          value={selected ?? ""}
          onValueChange={setChosen}
          aria-label={t("bankStatement.unmatchedList.searchLabel")}
        >
          {found.map((candidate) => (
            <div
              key={candidate.id}
              className="flex flex-col gap-2"
            >
              <p className="font-medium">
                {candidate.firstName} {candidate.lastName} · #{candidate.number}
              </p>
              {candidate.terms.map((term) => {
                const id = `assign-${transaction.id}-${candidate.id}-${term.termId}`
                const isSelected = choiceOf(candidate.id, term.termId) === selected
                return (
                  <div
                    key={term.termId}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isSelected ? "bg-accent" : ""}`}
                  >
                    <RadioGroupItem
                      id={id}
                      value={choiceOf(candidate.id, term.termId)}
                    />
                    <Label
                      htmlFor={id}
                      className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 font-normal"
                    >
                      <TermLabel term={term} />
                      <Badge>{t(`termStatus.state.${term.status}`)}</Badge>
                      {term.owedCzk > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {t("bankStatement.unmatchedList.owed", {
                            amount: formatCzk(term.owedCzk),
                          })}
                        </span>
                      ) : null}
                    </Label>
                  </div>
                )
              })}
            </div>
          ))}
        </RadioGroup>
      )}
      {after ? (
        <div className="flex flex-col gap-1 border-t pt-4">
          <p className="font-medium">{t("payment.afterCorrection")}</p>
          <p>
            {after.overCzk > 0
              ? t("bankStatement.unmatchedList.afterSaveOver", {
                  from: formatCzk(after.fromCzk),
                  to: formatCzk(after.toCzk),
                  over: formatCzk(after.overCzk),
                })
              : t("bankStatement.unmatchedList.afterSaveLine", {
                  from: formatCzk(after.fromCzk),
                  to: formatCzk(after.toCzk),
                  rest: formatCzk(after.restCzk),
                })}
          </p>
        </div>
      ) : null}
      {isChoiceMissing && !selection ? (
        <Alert variant="destructive">
          <AlertDescription>{t("termChange.pick")}</AlertDescription>
        </Alert>
      ) : null}
      {assign.error ? (
        <Alert variant="destructive">
          <AlertDescription>{assign.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={assign.isPending}
          onClick={onClose}
        >
          {t("bankStatement.unmatchedList.cancel")}
        </Button>
        <PendingButton
          type="submit"
          size="lg"
          isPending={assign.isPending}
        >
          {t("bankStatement.unmatchedList.submit")}
        </PendingButton>
      </div>
    </form>
  )
}
