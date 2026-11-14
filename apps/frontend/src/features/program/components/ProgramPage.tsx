import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { termDatesLine } from "@/lib/term-label"

import { eventProgramQueryOptions, type ProgramBlock } from "@/features/program/api/program"
import { DeleteProgramBlockDialog } from "@/features/program/components/DeleteProgramBlockDialog"
import { ProgramBlockDetailDialog } from "@/features/program/components/ProgramBlockDetailDialog"
import { ProgramBlockDialog } from "@/features/program/components/ProgramBlockDialog"
import { ProgramCalendar } from "@/features/program/components/ProgramCalendar"

type Editor = { block?: ProgramBlock; date: string }

// The program of an event, term by term: pick a term, see its days with blocks by time, add / edit
// in a dialog, delete after a confirmation. Each term has its own program.
// Design: Figma (Design system) US-66 · O35 Program termínu · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23263-91745
// Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23266-93029
export function ProgramPage({ eventId }: { eventId: string }) {
  const { t } = useTranslation("program")
  const query = useQuery(eventProgramQueryOptions(eventId))
  const [termId, setTermId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<ProgramBlock | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [deleting, setDeleting] = useState<ProgramBlock | null>(null)

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

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("title")} />
      <SectionHeader
        title={t("title")}
        description={t("description")}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Label htmlFor="program-term">{t("termLabel")}</Label>
          <Select
            value={term.termId}
            onValueChange={setTermId}
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
        <Button
          size="lg"
          className="max-sm:w-full"
          onClick={() => {
            setEditor({ date: term.startsOn })
          }}
        >
          {t("add")}
        </Button>
      </div>
      {term.blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}
      <ProgramCalendar
        term={term}
        onSelect={setViewing}
      />
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
