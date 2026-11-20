import { useTranslation } from "react-i18next"

import { Card } from "@/components/ui/card"
import { formatDateTime } from "@/lib/date"

import type { EditableApplication } from "@/features/participant/api/applicationEdit"

const isAccommodation = (field: string) =>
  field === "accommodationRequest" || field === "individualAccommodation"

function EditHistoryLine({ change }: { change: EditableApplication["history"][number] }) {
  const { t } = useTranslation("participant")
  const fields = change.changedFields
  const hasAccommodationChanges = fields.some(isAccommodation)
  const hasPersonalChanges = fields.some((field) =>
    ["firstName", "lastName", "birthDate"].includes(field),
  )
  const hasContactChanges = fields.includes("phone")
  const kinds = [
    hasPersonalChanges && t("edit.historyPersonal"),
    hasContactChanges && t("edit.historyContact"),
    hasAccommodationChanges && t("edit.historyAccommodation"),
  ].filter(Boolean)
  const description =
    hasAccommodationChanges && fields.filter((field) => !isAccommodation(field)).join() === "phone"
      ? t("edit.historyContactAccommodation")
      : t("edit.historyOther", { fields: kinds.join(", ") })
  return (
    <li className="flex flex-col gap-4 text-sm">
      <p>
        {formatDateTime(change.createdAt)} · {change.authorName}
      </p>
      <p>{description}</p>
    </li>
  )
}

function AccommodationSummary({ saved }: { saved: EditableApplication }) {
  const { t } = useTranslation("participant")
  return (
    <p>
      {saved.individualAccommodation
        ? t("edit.accommodationSummary", {
            request: [t("edit.accommodationIndividual"), saved.accommodationRequest]
              .filter(Boolean)
              .join(" · "),
          })
        : t("edit.noAccommodationRequest")}
    </p>
  )
}

// Figma: US-34 / Uloženo · detail přihlášky a historie · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK?node-id=20491-17822
export function ApplicationEditHistory({ saved }: { saved: EditableApplication }) {
  const { t } = useTranslation("participant")
  return (
    <div className="flex w-full max-w-[900px] flex-col gap-6">
      <Card className="gap-4 p-4">
        <h2 className="text-2xl font-semibold">{t("edit.accommodationSummaryTitle")}</h2>
        <AccommodationSummary saved={saved} />
      </Card>
      <Card className="gap-4 p-4">
        <h2 className="text-2xl font-semibold">{t("edit.historyHeading")}</h2>
        <ul className="flex flex-col gap-4">
          {saved.history.map((change) => (
            <EditHistoryLine
              key={change.id}
              change={change}
            />
          ))}
        </ul>
      </Card>
    </div>
  )
}
