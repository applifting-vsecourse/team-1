import { useQuery } from "@tanstack/react-query"

import { termStatusesQueryOptions } from "@/features/event-overview/api/termStatus"
import { SubstituteRecordCard } from "@/features/event-overview/components/SubstituteRecordCard"

// Figma (Design system): US-105 Detail přihlášky · Historie · Záznam v detailu účastníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15781-5897 (mobile 15781-5970)
// Records of confirmations from the waitlist in the detail of an application: where it was
// confirmed and where it was skipped by a confirmation of someone else. Shares the query of
// `TermStatuses`. Figma draws no empty state, so without a record nothing is shown.
export function ApplicationSubstituteRecords({ applicationId }: { applicationId: string }) {
  const { data } = useQuery(termStatusesQueryOptions(applicationId))
  if (!data) return null
  const records = data.flatMap((term) => term.substituteRecords.map((record) => ({ record, term })))
  if (records.length === 0) return null
  return (
    <>
      {records.map(({ record, term }) => (
        <SubstituteRecordCard
          key={record.id}
          record={record}
          term={term}
        />
      ))}
    </>
  )
}
