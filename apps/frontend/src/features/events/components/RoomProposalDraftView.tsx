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
      <h3 className="text-xl font-semibold">{t("roomProposal.title")}</h3>
      <Alert>
        <TriangleAlert aria-hidden />
        <AlertTitle>{t("roomProposal.unsavedTitle")}</AlertTitle>
        <AlertDescription>{t("roomProposal.unsavedDescription")}</AlertDescription>
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-primary text-primary-foreground">
          {t("roomProposal.newAssignments", { count })}
        </Badge>
        <Badge variant={failedWishes.length > 0 ? "warning" : "success"}>
          {t("roomProposal.unfulfilledWishes", { count: failedWishes.length })}
        </Badge>
        <Badge className="bg-primary text-primary-foreground">
          {t("roomProposal.violations", { count: data.summary.violations })}
        </Badge>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {data.rooms.map((room) => {
          const proposed = proposedIn(draft, room.id)
          return (
            <li key={room.id}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h4>{room.name}</h4>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {room.gender ? (
                      <Badge variant="secondary">{roomGenderLabel(room.gender)}</Badge>
                    ) : null}
                    {proposed.length > 0 ? (
                      <Badge variant="secondary">{t("roomProposal.proposedBadge")}</Badge>
                    ) : null}
                  </div>
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
                  <ul className="flex flex-wrap gap-2">
                    {room.participants.map((person) => (
                      <li
                        key={person.applicationTermId}
                        className="rounded-lg border border-border bg-secondary px-2 py-1 text-sm"
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
              </Card>
            </li>
          )
        })}
      </ul>
      {draft.unplaced.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h4>{t("roomProposal.noBedTitle", { count: draft.unplaced.length })}</h4>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
      ) : null}
      {failedWishes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h4>{t("roomProposal.wishesTitle", { count: failedWishes.length })}</h4>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {failedWishes.map((wish) => (
                <li key={`${wish.applicationTermId}:${wish.name}`}>
                  {t("roomProposal.wishLine", {
                    name: nameOf(wish.applicationTermId),
                    wish: wish.name,
                  })}
                </li>
              ))}
            </ul>
          </CardContent>
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
