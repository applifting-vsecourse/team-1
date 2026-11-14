import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { Seo } from "@/components/atoms/Seo"
import { EmptyState } from "@/components/molecules/EmptyState"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { termDatesLine } from "@/lib/term-label"

import { applicationProgramQueryOptions } from "@/features/program/api/program"
import { ProgramCalendar } from "@/features/program/components/ProgramCalendar"

// The program of the terms the participant is confirmed in: days and blocks by time, with a switch
// between terms when there are more. Waitlisted, cancelled and archived terms have none.
// Deviation from Figma by request: the same calendar as the organizer's, read only.
// Design: Figma (Design system) US-66 · U14 Program · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23269-27218
// Mobile · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=23270-27504
export function ParticipantProgram({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("program")
  const query = useQuery(applicationProgramQueryOptions(applicationId))
  const [termId, setTermId] = useState<string | null>(null)

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
  const { terms, eventName, participantName } = query.data
  const term = terms.find((item) => item.termId === termId) ?? terms[0]

  return (
    <div className="flex flex-col gap-6">
      <Seo title={t("own.pageTitle")} />
      <BackLink
        to={ROUTES.participant.application}
        params={{ applicationId }}
      >
        {t("own.back")}
      </BackLink>
      <SectionHeader
        title={t("own.title")}
        description={`${eventName} · ${participantName}`}
      />
      {terms.length > 1 && term ? (
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
      ) : null}
      {term?.blocks.length ? (
        <ProgramCalendar term={term} />
      ) : (
        <EmptyState message={t("own.empty")} />
      )}
    </div>
  )
}
