import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { RoomAssignments } from "@/features/events/api/room-assignments"
import {
  participantName,
  useAssignmentLabels,
} from "@/features/events/components/room-assignment-labels"
import {
  proposedIn,
  unfulfilledWishes,
  type RoomDraft,
} from "@/features/events/components/room-proposal"

// Figma (Design system v2): Neuložený návrh rozdělení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-7903 (mobile 24910-8356)
/** The unsaved proposal: rooms with the proposed people, who stays without a bed and which wishes fail. */
export function RoomProposalDraftView({
  data,
  draft,
  onEdit,
  onSave,
  onDiscard,
}: {
  data: RoomAssignments
  draft: RoomDraft
  onEdit: (applicationTermId: string) => void
  onSave: () => void
  onDiscard: () => void
}) {
  const { t } = useTranslation("events")
  const { roomGenderLabel } = useAssignmentLabels()
  const people = new Map(data.unassigned.map((person) => [person.applicationTermId, person]))
  const count = Object.keys(draft.placements).length
  const failedWishes = unfulfilledWishes(data.rooms, draft)
  const hasSharedRooms = data.rooms.some((room) => room.gender === null)
  const nameOf = (id: string): string => {
    const person = people.get(id)
    return person ? participantName(person) : id
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="text-xl font-semibold">{t("roomProposal.title")}</h3>
        <Badge variant="secondary">{t("roomProposal.newAssignments", { count })}</Badge>
        {failedWishes.length > 0 ? (
          <Badge variant="warning">
            {t("roomProposal.unfulfilledWishes", { count: failedWishes.length })}
          </Badge>
        ) : null}
        {data.summary.violations > 0 ? (
          <Badge variant="warning">
            {t("roomProposal.violations", { count: data.summary.violations })}
          </Badge>
        ) : null}
      </div>
      <Alert className="py-3">
        <TriangleAlert aria-hidden />
        <AlertTitle>{t("roomProposal.unsavedTitle")}</AlertTitle>
        <AlertDescription>{t("roomProposal.unsavedDescription")}</AlertDescription>
      </Alert>
      <ul className="grid gap-4 md:grid-cols-2">
        {data.rooms.map((room) => {
          const proposed = proposedIn(draft, room.id)
          return (
            <li key={room.id}>
              <Card className="h-full gap-3 py-4">
                <CardHeader className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <h4>{room.name}</h4>
                    {room.gender ? (
                      <Badge variant="secondary">{roomGenderLabel(room.gender)}</Badge>
                    ) : null}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {[
                      t("roomProposal.occupancy", {
                        occupied: room.participants.length + proposed.length,
                        beds: room.beds,
                      }),
                      proposed.length > 0
                        ? t("roomProposal.proposedCount", { count: proposed.length })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </CardHeader>
                {room.participants.length + proposed.length > 0 ? (
                  <CardContent>
                    <ul className="flex flex-wrap gap-2">
                      {room.participants.map((person) => (
                        <li
                          key={person.applicationTermId}
                          className="inline-flex h-8 items-center rounded-sm border border-border bg-secondary px-3 text-sm"
                        >
                          {participantName(person)}
                        </li>
                      ))}
                      {proposed.map((id) => (
                        <li key={id}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-primary bg-accent"
                            aria-label={t("roomProposal.editFor", { name: nameOf(id) })}
                            onClick={() => onEdit(id)}
                          >
                            {nameOf(id)}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                ) : null}
              </Card>
            </li>
          )
        })}
      </ul>
      {draft.unplaced.length > 0 || failedWishes.length > 0 ? (
        <Card className="gap-4 py-4">
          {draft.unplaced.length > 0 ? (
            <section className="flex flex-col gap-2 px-6">
              <h4 className="text-sm font-semibold">
                {t("roomProposal.noBedTitle", { count: draft.unplaced.length })}
              </h4>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {draft.unplaced.map((item) => {
                  const person = people.get(item.applicationTermId)
                  const reason =
                    item.reason === "INDIVIDUAL_ACCOMMODATION"
                      ? t("roomProposal.individual")
                      : hasSharedRooms
                        ? t("roomProposal.noBedAny")
                        : t(
                            person?.gender === "MALE"
                              ? "roomProposal.noBedMale"
                              : "roomProposal.noBedFemale",
                          )
                  return (
                    <li key={item.applicationTermId}>
                      {nameOf(item.applicationTermId)} · {reason}
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}
          {failedWishes.length > 0 ? (
            <section
              className={`flex flex-col gap-2 px-6 ${draft.unplaced.length > 0 ? "border-t border-border pt-4" : ""}`}
            >
              <h4 className="text-sm font-semibold">
                {t("roomProposal.wishesTitle", { count: failedWishes.length })}
              </h4>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {failedWishes.map((wish) => (
                  <li key={`${wish.applicationTermId}:${wish.name}`}>
                    {t("roomProposal.wishLine", {
                      name: nameOf(wish.applicationTermId),
                      wish: wish.name,
                    })}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </Card>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-4">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="max-sm:w-full"
          onClick={onDiscard}
        >
          {t("roomProposal.discard")}
        </Button>
        <Button
          type="button"
          size="lg"
          className="max-sm:w-full"
          disabled={count === 0}
          onClick={onSave}
        >
          {t("roomProposal.save")}
        </Button>
      </div>
    </div>
  )
}
