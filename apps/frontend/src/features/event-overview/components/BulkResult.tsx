import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { formatDateRange } from "@/lib/date"

import { QueueRow } from "@/features/event-overview/components/QueueRow"
import type { BulkResultView } from "@/features/event-overview/lib/bulk-result"

// Figma (Design system): US-107 Přihlášky · Výsledek hromadného potvrzení · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15803-16332 (mobile 15803-16488)
export function BulkResult({ eventId, result }: { eventId: string; result: BulkResultView }) {
  const { t, i18n } = useTranslation("eventOverview")
  const list = new Intl.ListFormat(i18n.language, { style: "long", type: "conjunction" })
  const firstNames = (rows: BulkResultView["confirmed"]) =>
    list.format(rows.map((row) => row.firstName))
  return (
    <>
      <p>
        {t("bulk.resultHeading", {
          term: formatDateRange(result.term.startsOn, result.term.endsOn, { shouldShowYear: true }),
        })}
      </p>
      <Alert className="items-center rounded-xl bg-secondary px-4 py-4 has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] [&>svg]:size-5 [&>svg]:translate-y-0 [&>svg]:self-center">
        <TriangleAlert aria-hidden="true" />
        <AlertTitle className="line-clamp-none font-medium tracking-normal text-foreground">
          {t("bulk.resultTitle", {
            confirmed: t("bulk.resultConfirmed", { count: result.confirmed.length }),
            unchanged: result.unchanged.length,
          })}
        </AlertTitle>
        <AlertDescription>
          {[
            result.confirmed.length > 0 &&
              t("bulk.resultMails", {
                count: result.confirmed.length,
                names: firstNames(result.confirmed),
              }),
            result.unchanged.length > 0 &&
              t("bulk.resultStays", {
                count: result.unchanged.length,
                names: firstNames(result.unchanged),
              }),
          ]
            .filter(Boolean)
            .join(" ")}
        </AlertDescription>
      </Alert>
      <ul className="flex flex-col gap-4">
        {result.confirmed.map((row) => (
          <li key={row.id}>
            <QueueRow
              eventId={eventId}
              application={row}
              termId={result.term.id}
              outcome="CONFIRMED"
            />
          </li>
        ))}
        {result.unchanged.map((row) => (
          <li key={row.id}>
            <QueueRow
              eventId={eventId}
              application={row}
              termId={result.term.id}
            />
          </li>
        ))}
      </ul>
    </>
  )
}
