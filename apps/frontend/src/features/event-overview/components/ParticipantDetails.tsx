import { useTranslation } from "react-i18next"

import { DetailItem } from "@/components/molecules/DetailItem"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/date"

import type { PaymentApplication } from "@/features/event-overview/api/payments"

type ParticipantDetailsProps = {
  application: Pick<PaymentApplication, "firstName" | "lastName" | "birthDate" | "gender" | "email">
}

/**
 * The participant's name, date of birth and gender, and the applicant's contact. Stacked on a
 * phone, a row of three columns from md up.
 */
// Figma (Design system): Údaje účastníka · Detail přihlášky · Platby · Organizátor · dluh po termínech · https://www.figma.com/design/P7CQo6rDSptsyLvCR55b8J/Design-system?node-id=15845-7697 (360 px: node-id=15845-7814)
export function ParticipantDetails({ application }: ParticipantDetailsProps) {
  const { t } = useTranslation("eventOverview")
  const gender = t(application.gender === "FEMALE" ? "payment.genderFemale" : "payment.genderMale")

  return (
    <Card
      role="group"
      aria-label={t("payment.participantCard")}
      className="gap-2 rounded-2xl p-4 shadow-none md:grid md:grid-cols-3 md:items-center md:gap-4"
    >
      <p className="text-2xl font-bold">
        {application.firstName} {application.lastName}
      </p>
      <DetailItem label={t("payment.participantBirthGender")}>
        {formatDate(application.birthDate)} · {gender}
      </DetailItem>
      <DetailItem label={t("payment.participantContact")}>{application.email}</DetailItem>
    </Card>
  )
}
