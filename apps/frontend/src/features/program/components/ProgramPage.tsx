import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Copy } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { notify } from "@/lib/notify"
import { termDatesLine } from "@/lib/term-label"

import {
  eventProgramQueryOptions,
  programKeys,
  saveProgramBlock,
  type ProgramBlock,
  type ProgramCopyResult,
} from "@/features/program/api/program"
import { CopyProgramDialog } from "@/features/program/components/CopyProgramDialog"
import { DeleteProgramBlockDialog } from "@/features/program/components/DeleteProgramBlockDialog"
import { ProgramBlockDetailDialog } from "@/features/program/components/ProgramBlockDetailDialog"
import { ProgramBlockDialog } from "@/features/program/components/ProgramBlockDialog"
import { ProgramCalendar } from "@/features/program/components/ProgramCalendar"
import { trackedOverlaps } from "@/features/program/lib/calendar"
import { formatDay, formatDayHeader, timeRange } from "@/features/program/lib/days"

type Editor = { block?: ProgramBlock; date: string }

// The program of an event, term by term: pick a term, see its days with blocks by time, add / edit
// in a dialog, delete after a confirmation. Each term has its own program.
// Figma v2: US-66 O35 Program termínu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=23263-91745 (360 px: M14 23266-93029)
// Figma v2: O35a Prázdný program · node-id=23263-92161 (360 px: M14a 23266-93325); O35b Akce bez termínů · node-id=23263-92538 (M14b 23266-93636)
// Figma v2: Program zkopírován / nahrazen · node-id=24910-18756 / 24910-18343
export function ProgramPage({ eventId }: { eventId: string }) {
  const { t } = useTranslation("program")
  const query = useQuery(eventProgramQueryOptions(eventId))
  const [termId, setTermId] = useState<string | null>(null)
  const [agendaDay, setAgendaDay] = useState<string | null>(null)
  const [viewing, setViewing] = useState<ProgramBlock | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleting, setDeleting] = useState<ProgramBlock | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  // The copy result is a snapshot; `blockIds` are the blocks the copy created, so the overlaps are
  // recomputed from the current blocks after every change. `null` when the program could not be
  // hasReloaded after the copy: the overlaps the copy reported stay until then.
  const [copied, setCopied] = useState<{
    termId: string
    result: ProgramCopyResult
    blockIds: ReadonlySet<string> | null
  } | null>(null)
  const queryClient = useQueryClient()
  // The copy result describes the program as it was right after the copy, so the organizer's next
  // action in the program (another term, a block, adding, another copy) dismisses it.
  const dismissCopied = () => {
    setCopied(null)
  }

  const move = useMutation({
    mutationFn: ({ id, date, startTime, endTime, name, place, description }: ProgramBlock) =>
      saveProgramBlock(
        eventId,
        { date, startTime, endTime, name, place: place ?? "", description: description ?? "" },
        { id },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programKeys.event(eventId) })
      notify.success(t("saved"), t("savedDescription"))
    },
    onError: (error) => notify.error(t("saveFailed"), error.message),
  })

  if (!query.data) {
    return query.isError ? (
      <ErrorState
        title={t("loadFailed")}
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    ) : (
      <LoadingState />
    )
  }
  const { terms } = query.data
  const term = terms.find((item) => item.termId === termId) ?? terms[0]
  if (!term) {
    return (
      <div className="flex flex-col gap-6">
        <Seo title={t("title")} />
        <SectionHeader title={t("title")} />
        <EmptyState
          message={t("noTerms")}
          action={
            <Button
              asChild
              size="lg"
            >
              <Link
                to={ROUTES.organizer.eventTerms}
                params={{ eventId }}
              >
                {t("noTermsAction")}
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  // Overlaps tracked from the current blocks carry no times; the copy result may.
  const copiedOverlaps: ProgramCopyResult["overlaps"] =
    copied?.termId !== term.termId
      ? []
      : copied.blockIds
        ? trackedOverlaps(term.blocks, copied.blockIds)
        : copied.result.overlaps

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("title")} />
      <SectionHeader title={t("title")} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Label htmlFor="program-term">{t("termLabel")}</Label>
          <Select
            value={term.termId}
            onValueChange={(value) => {
              dismissCopied()
              setTermId(value)
              setAgendaDay(null)
            }}
          >
            <SelectTrigger
              id="program-term"
              className="w-full bg-card sm:w-80"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {terms.map((item) => (
                <SelectItem
                  key={item.termId}
                  value={item.termId}
                >
                  {termDatesLine({ ...item, name: item.termName })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            size="lg"
            className="max-sm:w-full"
            onClick={() => {
              dismissCopied()
              const date =
                agendaDay && agendaDay >= term.startsOn && agendaDay <= term.endsOn
                  ? agendaDay
                  : term.startsOn
              setEditor({ date })
            }}
          >
            {t("add")}
          </Button>
          {terms.length > 1 ? (
            <Button
              variant="outline"
              size="lg"
              className="max-sm:w-full sm:order-first"
              onClick={() => {
                dismissCopied()
                setIsCopying(true)
              }}
            >
              <Copy aria-hidden />
              {t("copy.open")}
            </Button>
          ) : null}
        </div>
      </div>
      {copied?.termId === term.termId ? (
        <Card className="min-w-0 gap-3 p-4">
          <p className="text-sm font-semibold">
            {t("copy.resultTitle", { count: copied.result.copied, copied: copied.result.copied })}
            {copied.result.skipped > 0
              ? ` · ${t("copy.resultSkipped", { count: copied.result.skipped })}`
              : ""}
          </p>
          {copiedOverlaps.length > 0 ? (
            <Alert variant="warning">
              <AlertTitle>{t("copy.overlapHeading", { count: copiedOverlaps.length })}</AlertTitle>
              <AlertDescription className="text-foreground">
                {copiedOverlaps
                  .map((item) =>
                    t(
                      item.startTime && item.endTime
                        ? "copy.overlapTimed"
                        : "copy.overlapResultItem",
                      {
                        from: item.startTime,
                        to: item.endTime,
                        first: item.first,
                        second: item.second,
                        date: formatDay(item.date),
                      },
                    ),
                  )
                  .join(" ")}
              </AlertDescription>
            </Alert>
          ) : null}
          {copied.result.blocks?.length ? (
            <ul
              aria-label={t("copy.copiedBlocks")}
              className="grid grid-cols-1 gap-2 md:grid-cols-3"
            >
              {copied.result.blocks.map((block, index) => (
                <li
                  key={index}
                  className="min-w-0 space-y-1 rounded-lg border bg-muted p-3"
                >
                  <p className="text-xs text-muted-foreground">
                    {formatDayHeader(block.date).date}
                  </p>
                  <p className="text-sm font-semibold break-words">{block.name}</p>
                  <p className="text-sm">
                    {timeRange(block)}
                    {block.place && ` · ${block.place}`}
                  </p>
                  {block.description && (
                    <p className="text-sm break-words text-muted-foreground">{block.description}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}
      {term.blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}
      <ProgramCalendar
        key={term.termId}
        onDayChange={setAgendaDay}
        onMove={(block) => {
          const handle = document.activeElement
          const shouldRestoreFocus =
            handle instanceof HTMLElement && handle.dataset.programMove === block.id
          move.mutate(block, {
            onSuccess: () => {
              if (shouldRestoreFocus && document.activeElement === document.body) {
                document
                  .querySelector<HTMLButtonElement>(`[data-program-move="${CSS.escape(block.id)}"]`)
                  ?.focus()
              }
            },
          })
        }}
        isSaving={move.isPending}
        term={term}
        onSelect={(block) => {
          dismissCopied()
          setViewing(block)
        }}
      />
      {isCopying ? (
        <CopyProgramDialog
          eventId={eventId}
          target={term}
          sourceTerms={terms.filter((item) => item.termId !== term.termId)}
          onClose={() => {
            setIsCopying(false)
          }}
          onCopied={async (result, strategy) => {
            const before = new Set(term.blocks.map((block) => block.id))
            await queryClient.invalidateQueries({ queryKey: programKeys.event(eventId) })
            const key = eventProgramQueryOptions(eventId).queryKey
            const hasReloaded = queryClient.getQueryState(key)?.status === "success"
            const after = queryClient
              .getQueryData(key)
              ?.terms.find((item) => item.termId === term.termId)
            // An add keeps the old blocks; a replace deletes them all, so everything is new.
            const blockIds =
              hasReloaded && after
                ? new Set(
                    after.blocks
                      .filter((block) => strategy === "REPLACE" || !before.has(block.id))
                      .map((block) => block.id),
                  )
                : null
            setCopied({ termId: term.termId, result, blockIds })
            notify.success(t(strategy === "REPLACE" ? "copy.replaced" : "copy.done"))
          }}
        />
      ) : null}
      {viewing ? (
        <ProgramBlockDetailDialog
          block={viewing}
          onEdit={() => {
            setEditor({ block: viewing, date: viewing.date })
            setViewing(null)
          }}
          onDelete={() => {
            setDeleting(viewing)
            setViewing(null)
          }}
          onClose={() => {
            setViewing(null)
          }}
        />
      ) : null}
      {editor ? (
        <ProgramBlockDialog
          key={editor.block?.id ?? "new"}
          eventId={eventId}
          term={term}
          block={editor.block}
          defaultDate={editor.date}
          onClose={() => {
            setEditor(null)
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteProgramBlockDialog
          eventId={eventId}
          block={deleting}
          onClose={() => {
            setDeleting(null)
          }}
        />
      ) : null}
    </div>
  )
}
