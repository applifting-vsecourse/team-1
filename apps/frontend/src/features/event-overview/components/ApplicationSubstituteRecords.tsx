import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { DetailItem } from "@/components/molecules/DetailItem"
import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"

import { stillSkipped } from "@/features/event-overview/api/substituteRecords"
import { termStatusesQueryOptions } from "@/features/event-overview/api/termStatus"

// Figma (Design system): US-105 Detail přihlášky · Historie · Záznam v detailu účastníka · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15781-5897 (mobile 15781-5970)
// Records of confirmations from the waitlist in the detail of an application. The confirmation
// itself is already in the status history, so the confirmed application only lists whom it
// passed over, and a passed-over one shows who was confirmed ahead of it. Shares the query of
// `TermStatuses`. Figma draws no empty state, so without a record nothing is shown.
export function ApplicationSubstituteRecords({ applicationId }: { applicationId: string }) {
  const { t } = useTranslation("eventOverview")
  const { data } = useQuery(termStatusesQueryOptions(applicationId))
  if (!data) return null
  const records = data.flatMap((term) => term.substituteRecords)
  const cards = records.flatMap((record) => {
    const skipped = stillSkipped(record)
    if (record.confirmed.applicationId !== applicationId) {
      if (!skipped.some((person) => person.applicationId === applicationId)) return []
      return [
        <DetailItem
          key={record.id}
          label={t("substituteRecord.skippedBy")}
        >
          {record.confirmed.name} · {formatDateTime(record.changedAt)}
        </DetailItem>,
      ]
    }
    if (skipped.length === 0) return []
    return [
      <DetailItem
        key={record.id}
        label={t("substituteRecord.skippedAmong", { count: skipped.length })}
      >
        {skipped.map((person) => person.name).join(", ")}
      </DetailItem>,
    ]
  })
  if (cards.length === 0) return null
  return <Card className="gap-4 p-4">{cards}</Card>
}
