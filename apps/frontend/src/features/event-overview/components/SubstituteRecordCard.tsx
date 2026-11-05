import { useTranslation } from "react-i18next"

import { DetailItem } from "@/components/molecules/DetailItem"
import { Card } from "@/components/ui/card"
import { formatDateRange, formatDateTime } from "@/lib/date"

import type { SubstituteRecord } from "@/features/event-overview/api/substituteRecords"

const GROUP_KEY = { MALE: "groupMale", FEMALE: "groupFemale", SHARED: "groupShared" } as const

// Figma (Design system): US-105 Detail přihlášky · Historie · Záznam v detailu účastníka (Potvrzení náhradníka) · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15781-5897 (mobile 15781-5970); also in Přihlášky · Náhradníci · historie · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15781-6016 (mobile 15781-6089)
// System record of one confirmation from the waitlist: who was confirmed, who was skipped, who did
// it and when. Written automatically, shown read-only in the detail and at the waitlist.
export function SubstituteRecordCard({
  record,
  term,
}: {
  record: SubstituteRecord
  term: { startsOn: string; endsOn: string }
}) {
  const { t } = useTranslation("eventOverview")
  const range = formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true })
  return (
    <Card className="gap-4 p-4">
      <h2 className="text-2xl font-bold">{t("substituteRecord.title")}</h2>
      <DetailItem label={t("substituteRecord.who")}>
        {record.changedByName ?? t("termStatus.system")} · {formatDateTime(record.changedAt)}
      </DetailItem>
      <DetailItem label={t("substituteRecord.confirmed")}>{record.confirmed.name}</DetailItem>
      <DetailItem label={t("substituteRecord.change")}>
        {t("substituteRecord.changeValue")}
      </DetailItem>
      {record.skipped.length > 0 && (
        <DetailItem label={t("substituteRecord.skipped", { count: record.skipped.length })}>
          {record.skipped.map((person) => person.name).join(", ")} ·{" "}
          {t("substituteRecord.staysSubstitute", { count: record.skipped.length })}
        </DetailItem>
      )}
      <DetailItem label={t("substituteRecord.termAndGroup")}>
        {range} · {t(`substituteRecord.${GROUP_KEY[record.group]}`)}
      </DetailItem>
      <p className="text-sm text-muted-foreground">{t("substituteRecord.automatic")}</p>
    </Card>
  )
}
