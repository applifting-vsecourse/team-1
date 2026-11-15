import { useQuery } from "@tanstack/react-query"
import { Info } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatDateRange } from "@/lib/date"

import { currentRecords } from "@/features/event-overview/api/substituteRecords"
import { termStatusesQueryOptions } from "@/features/event-overview/api/termStatus"

// Figma (Design system): US-31 Automatický režim · účast potvrzena · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=22642-89670 (mobile 22642-89830)
// Says in the detail of an application that the system gave it a freed bed (US-31): the current
// confirmation from the waitlist of a term was made by the system, not by an organizer. Shares the
// query of `TermStatuses`; nothing is shown otherwise.
export function AutoConfirmedNotice({
  applicationId,
  firstName,
  gender,
}: {
  applicationId: string
  firstName: string
  gender: "FEMALE" | "MALE"
}) {
  const { t } = useTranslation("eventOverview")
  const { data } = useQuery(termStatusesQueryOptions(applicationId))
  if (!data) return null
  const records = currentRecords(data.flatMap((term) => term.substituteRecords)).filter(
    (record) =>
      record.confirmed.applicationId === applicationId &&
      record.confirmed.status === "CONFIRMED" &&
      record.changedByName === null,
  )
  return records.map((record) => {
    const term = data.find((row) => row.termId === record.termId)
    if (!term) return null
    return (
      <Alert
        key={record.id}
        className="border-status-info bg-status-info-bg"
      >
        <Info aria-hidden="true" />
        <AlertTitle className="line-clamp-none">{t("autoConfirmed.title")}</AlertTitle>
        <AlertDescription>
          {t(gender === "FEMALE" ? "autoConfirmed.bodyFemale" : "autoConfirmed.bodyMale", {
            name: firstName,
            bed: t(`autoConfirmed.bed${record.group}`),
            range: formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }),
          })}
        </AlertDescription>
      </Alert>
    )
  })
}
