import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { ROUTES } from "@/app/routes"
import { BackLink } from "@/components/atoms/BackLink"
import { PendingButton } from "@/components/atoms/PendingButton"
import { ErrorState } from "@/components/molecules/ErrorState"
import { LoadingState } from "@/components/molecules/LoadingState"
import { SectionHeader } from "@/components/molecules/SectionHeader"
import { Card } from "@/components/ui/card"
import { notify } from "@/lib/notify"

import { saveRoomWishes } from "@/features/participant/api/applications"
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
        terms={withWishes.map((term) => ({ ...term, roomWishes: term.roomWishes?.names }))}
        editingTermId={editingTermId}
        onStartEditing={setEditingTermId}
        emptyExtra={(termId) =>
          withWishes.find((term) => term.termId === termId)?.roomWishes?.canDecline ? (
            <DeclineWishes
              applicationId={applicationId}
              termId={termId}
            />
          ) : null
        }
        onStopEditing={(termId) =>
          setEditingTermId((current) => (current === termId ? null : current))
        }
      />
      <TermStaySection
        applicationId={applicationId}
        writer="organizer"
        terms={withStay}
      />
    </div>
  )
}

/** „No wishes“ for the participant: only before the rooms are published and without names (US-146). */
function DeclineWishes({ applicationId, termId }: { applicationId: string; termId: string }) {
  const { t } = useTranslation("participant")
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => saveRoomWishes(applicationId, termId, [], true, "organizer"),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["organizer", "applications"] })
      await client.invalidateQueries({ queryKey: ["participant", "applications"] })
      notify.success(t("organizerArrangements.declined"))
    },
    onError: () => notify.error(t("detail.steps.wishesSaveFailed")),
  })
  return (
    <PendingButton
      type="button"
      variant="outline"
      size="lg"
      isPending={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {t("detail.steps.wishesDecline")}
    </PendingButton>
  )
}
