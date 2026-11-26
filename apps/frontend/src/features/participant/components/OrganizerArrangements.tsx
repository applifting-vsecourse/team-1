import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Card } from "@/components/ui/card"

import { organizerArrangementsQueryOptions } from "@/features/participant/api/organizerArrangements"
import { RoomWishesSection } from "@/features/participant/components/RoomWishes"
import { TermStaySection } from "@/features/participant/components/TermStay"

/**
 * The organizer writes roommate wishes and the later arrival / earlier departure for a participant
 * who does not use the application (D-191). The cards are the participant's own, only the data
 * and the API they write to are the organizer's. There is no Figma frame for the organizer.
 */
export function OrganizerArrangements({
  eventId,
  applicationId,
}: {
  eventId: string
  applicationId: string
}) {
  const { t } = useTranslation("participant")
  const { data, isPending, error, refetch } = useQuery(
    organizerArrangementsQueryOptions(applicationId),
  )
  const [editingTermId, setEditingTermId] = useState<string | null>(null)

  if (isPending) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        title={t("organizerArrangements.errorTitle")}
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  const withWishes = data.terms.filter((term) => term.roomWishes !== undefined)
  const withStay = data.terms.filter((term) => term.stay !== undefined)
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3 md:gap-4">
        <BackLink
          to={ROUTES.organizer.application}
          params={{ eventId, applicationId }}
        >
          {t("organizerArrangements.back")}
        </BackLink>
        <div className="min-w-0 flex-1 wrap-anywhere">
          <SectionHeader
            title={t("organizerArrangements.title")}
            description={`${data.firstName} ${data.lastName} · ${data.eventName}`}
          />
        </div>
      </div>
      {withWishes.length === 0 && withStay.length === 0 ? (
        <Card className="p-4">
          <p>{t("organizerArrangements.nothing")}</p>
        </Card>
      ) : null}
      <RoomWishesSection
        applicationId={applicationId}
        writer="organizer"
        terms={withWishes.map((term) => ({
          ...term,
          termEditable: term.editable,
          roomWishes: term.roomWishes?.names,
          noRoomWishes: term.roomWishes?.noRoomWishes,
          canDecline: term.roomWishes?.canDecline,
        }))}
        editingTermId={editingTermId}
        onStartEditing={setEditingTermId}
        onStopEditing={(termId) =>
          setEditingTermId((current) => (current === termId ? null : current))
        }
      />
      <TermStaySection
        applicationId={applicationId}
        writer="organizer"
        terms={withStay.map((term) => ({ ...term, termEditable: term.editable }))}
      />
    </div>
  )
}
