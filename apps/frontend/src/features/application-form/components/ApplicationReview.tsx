import { useTranslation } from "react-i18next"

import Edit from "@/assets/motion/review-edit.svg?react"
import { DetailItem } from "@/components/molecules/DetailItem"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/date"
import { formatTermPrice } from "@/lib/money"
import { termDates } from "@/lib/term-label"

import type { PublicTerm } from "@/features/application-form/api/publicEvent"
import type { ApplicationFormValues } from "@/features/application-form/lib/application-form-schema"

export type ReviewField = "email" | `participants.${number}.firstName`

type Props = {
  values: ApplicationFormValues
  terms: PublicTerm[]
  isSubmitting: boolean
  onEdit: (field: ReviewField) => void
}

function EditAction({
  label,
  onClick,
  isDisabled,
}: {
  label: string
  onClick: () => void
  isDisabled: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      aria-label={label}
      disabled={isDisabled}
      onClick={onClick}
      className="px-2 text-link md:size-11"
    >
      <Edit
        aria-hidden="true"
        className="hidden md:block"
      />
      <span className="md:hidden">{label}</span>
    </Button>
  )
}

// Figma v2: US-23 / Kontrola přihlášky · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=15506-941 (mobile 15506-1081).
export function ApplicationReview({ values, terms, isSubmitting, onEdit }: Props) {
  const { t } = useTranslation("applicationForm")
  return (
    <div className="review-content flex min-w-0 flex-col gap-4">
      <Card className="gap-2 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold md:text-2xl">{t("review.contact")}</h2>
          <EditAction
            label={t("review.editContact")}
            onClick={() => onEdit("email")}
            isDisabled={isSubmitting}
          />
        </div>
        <DetailItem label={t("review.email")}>{values.email}</DetailItem>
      </Card>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {values.participants.map((person, index) => (
          <Card
            key={index}
            className="min-w-0 gap-3 rounded-lg p-4 only:col-span-full"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="min-w-0 text-xl font-bold break-words md:text-2xl">
                {person.firstName} {person.lastName}
              </h2>
              <EditAction
                label={t("review.editDetails")}
                onClick={() => onEdit(`participants.${index}.firstName`)}
                isDisabled={isSubmitting}
              />
            </div>
            <DetailItem label={t("review.birthGender")}>
              {formatDate(person.birthDate)} ·{" "}
              {t(person.gender === "FEMALE" ? "form.genderFemale" : "form.genderMale")}
            </DetailItem>
            <DetailItem label={t("review.terms")}>
              {terms
                .filter((term) => person.termIds.includes(term.id))
                .map((term) => (
                  <span
                    className="block"
                    key={term.id}
                  >
                    {termDates(term)} · {formatTermPrice(term.priceCzk)}
                  </span>
                ))}
            </DetailItem>
            {person.individualAccommodation && (
              <DetailItem label={t("review.accommodation")}>
                {t("review.individual")}
                {person.accommodationRequest.trim() && ` · ${person.accommodationRequest.trim()}`}
              </DetailItem>
            )}
          </Card>
        ))}
      </div>
      <Card className="items-start gap-2 rounded-lg p-4">
        <h2 className="text-lg font-bold">{t("review.consent")}</h2>
        <Badge className="bg-primary text-primary-foreground">{t("review.agreed")}</Badge>
      </Card>
    </div>
  )
}
