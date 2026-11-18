import { useState } from "react"
import { Pencil } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DetailItem } from "@/components/molecules/DetailItem"
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
 * The participant's name, date of birth, gender and contact (the applicant's e-mail, the
 * participant's phone), with a button that opens the edit dialog while the application can still be
 * edited (#515). Stacked on a phone, three columns from md up.
 */
// Figma (Design system): #515 Varianta A · Detail po uložení · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=26111-127350
// Figma (Design system): Údaje účastníka · Detail přihlášky · Platby · Organizátor · dluh po termínech · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15845-7697 (360 px: node-id=15845-7814)
export function ParticipantDetails({ application }: ParticipantDetailsProps) {
  const { t } = useTranslation("eventOverview")
  const [isEditing, setIsEditing] = useState(false)
  const gender = t(application.gender === "FEMALE" ? "payment.genderFemale" : "payment.genderMale")

  return (
    <div
      role="group"
      aria-label={t("payment.participantCard")}
      className="grid min-w-0 gap-4 md:grid-cols-2"
    >
      <Card className="min-w-0 gap-3 p-4">
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
        <div className="flex flex-col gap-3">
          <DetailItem label={t("payment.participantName")}>
            {application.firstName} {application.lastName}
          </DetailItem>
          <DetailItem label={t("payment.participantBirthGender")}>
            {formatDate(application.birthDate)} · {gender}
          </DetailItem>
          <DetailItem label={t("payment.phoneLabel")}>
            {application.phone ?? t("payment.phoneNone")}
          </DetailItem>
        </div>
      </Card>
      <Card className="min-w-0 gap-3 p-4">
        <h3 className="text-lg font-semibold">{t("payment.applicant")}</h3>
        <DetailItem label={t("payment.participantContact")}>
          <a
            className="break-all text-link underline"
            href={`mailto:${application.email}`}
          >
            {application.email}
          </a>
        </DetailItem>
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
