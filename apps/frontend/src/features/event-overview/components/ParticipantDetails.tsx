import { useState } from "react"
import { Pencil } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/date"

import type { PaymentApplication } from "@/features/event-overview/api/payments"
import { ParticipantEditDialog } from "@/features/event-overview/components/ParticipantEditDialog"

type ParticipantDetailsProps = {
  application: Pick<
    PaymentApplication,
    | "id"
    | "firstName"
    | "lastName"
    | "birthDate"
    | "gender"
    | "email"
    | "phone"
    | "isEditable"
    | "individualAccommodation"
    | "accommodationRequest"
  >
}

/**
 * The participant's date of birth, gender and phone as "label · value" rows (the name is the
 * page heading), and the applicant's e-mail, with a button that opens the edit dialog while the
 * application can still be edited (#515). Stacked on a phone, two columns from md up.
 */
// Figma v2: US-53 Detail účastníka · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=22475-86190 (mobile 22475-86352)
export function ParticipantDetails({ application }: ParticipantDetailsProps) {
  const { t } = useTranslation("eventOverview")
  const [isEditing, setIsEditing] = useState(false)
  const rows = [
    [t("participant.birthDate"), formatDate(application.birthDate)],
    [
      t("participant.gender"),
      t(application.gender === "FEMALE" ? "participant.female" : "participant.male"),
    ],
    [t("participant.phone"), application.phone ?? t("payment.phoneNone")],
  ] as const

  return (
    <div
      role="group"
      aria-label={t("payment.participantCard")}
      className="grid min-w-0 items-start gap-4 md:grid-cols-2"
    >
      <Card className="min-w-0 gap-3 p-4 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">{t("payment.participantCard")}</h3>
          {application.isEditable ? (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={t("payment.editParticipant")}
              onClick={() => setIsEditing(true)}
            >
              <Pencil aria-hidden />
            </Button>
          ) : null}
        </div>
        <dl className="flex flex-col gap-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="inline">{label}</dt>
              <span aria-hidden> · </span>
              <dd className="inline">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card className="min-w-0 gap-3 p-4 md:p-6">
        <h3 className="text-lg font-semibold">{t("payment.applicant")}</h3>
        <a
          className="break-all text-link underline"
          href={`mailto:${application.email}`}
        >
          {application.email}
        </a>
      </Card>
      {isEditing ? (
        <ParticipantEditDialog
          application={application}
          onClose={() => setIsEditing(false)}
        />
      ) : null}
    </div>
  )
}
