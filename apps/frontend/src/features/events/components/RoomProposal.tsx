import { useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { formatDateRange } from "@/lib/date"
import { notify } from "@/lib/notify"

import {
  proposeRooms,
  roomAssignmentsQueryOptions,
  saveRoomProposal,
} from "@/features/events/api/room-assignments"
import { participantName } from "@/features/events/components/room-assignment-labels"
import {
  movableBeds,
  toDraft,
  unfulfilledWishes,
  type RoomDraft,
} from "@/features/events/components/room-proposal"
import {
  ConfirmProposalDialog,
  EditProposalDialog,
} from "@/features/events/components/RoomProposalDialogs"
import { RoomProposalDraftView } from "@/features/events/components/RoomProposalDraftView"

type Term = { eventId: string; termId: string; startsOn: string; endsOn: string }

// Automatic proposal of rooms (US-147): the button asks the API for a proposal, which is kept as
// an unsaved draft in the browser, can be edited and discarded, and is saved in one request only
// after the organizer confirms it. While a draft exists it takes the place of the room assignment.
// Figma (Design system v2): Organizátor · US-147 · Automatický návrh rozdělení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-6397
// Figma (Design system v2): Spustit návrh rozdělení · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-6398 (mobile 24910-6806)
// Figma (Design system v2): Vytváření návrhu · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-7137 (mobile 24910-7561)
// Figma (Design system v2): Rozdělení uloženo · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-11325 (mobile 24910-11747)
// Figma (Design system v2): Není koho navrhnout · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-12092 (mobile 24910-12502)
// Figma (Design system v2): Chyba návrhu · opakovat · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=24910-12835 (mobile 24910-13263)
export function RoomProposal({
  term,
  children,
}: {
  term: Term
  /** The room assignment; gets the "propose" button for its header and the notices to show above it. */
  children: (parts: { action: ReactNode; notices: ReactNode }) => ReactNode
}) {
  const { t } = useTranslation("events")
  const client = useQueryClient()
  const query = useQuery(roomAssignmentsQueryOptions(term.eventId, term.termId))
  const [draft, setDraft] = useState<RoomDraft | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [dialog, setDialog] = useState<"save" | "discard" | null>(null)
  const propose = useMutation({
    mutationFn: () => proposeRooms(term.eventId, term.termId),
    onSuccess: (proposal) => setDraft(toDraft(proposal)),
  })
  const save = useMutation({
    mutationFn: (placements: { applicationTermId: string; roomId: string }[]) =>
      saveRoomProposal(term.eventId, term.termId, placements),
  })
  const data = query.data
  if (!data) return <>{children({ action: null, notices: null })}</>

  const confirmedWaiting = data.unassigned.filter((person) => person.status === "CONFIRMED")
  // The proposal never fills an individual room (US-145), so only the other rooms count.
  const hasProposableRooms = data.rooms.some((room) => !room.individual)
  const canPropose =
    hasProposableRooms && confirmedWaiting.some((person) => !person.individualAccommodation)
  const hasOnlyIndividual = confirmedWaiting.length > 0 && !canPropose && hasProposableRooms

  if (draft) {
    const unfulfilled = unfulfilledWishes(data.rooms, draft).length
    const editedPerson = data.unassigned.find((person) => person.applicationTermId === editing)
    const confirmSave = async () => {
      const placements = Object.entries(draft.placements).map(([applicationTermId, roomId]) => ({
        applicationTermId,
        roomId,
      }))
      try {
        await save.mutateAsync(placements)
      } catch {
        return
      }
      await client.invalidateQueries({ queryKey: ["events", term.eventId] })
      notify.success(
        t("roomProposal.savedTitle"),
        [
          t("roomProposal.savedAssigned", { count: placements.length }),
          draft.unplaced.length > 0
            ? t("roomProposal.savedNoBed", { count: draft.unplaced.length })
            : null,
        ]
          .filter(Boolean)
          .join(" "),
      )
      setDialog(null)
      setDraft(null)
    }
    return (
      <>
        <RoomProposalDraftView
          data={data}
          draft={draft}
          onEdit={setEditing}
          onSave={() => {
            save.reset()
            setDialog("save")
          }}
          onDiscard={() => setDialog("discard")}
        />
        {editedPerson ? (
          <EditProposalDialog
            key={editedPerson.applicationTermId}
            name={participantName(editedPerson)}
            beds={movableBeds(data.rooms, draft, editedPerson)}
            onClose={() => setEditing(null)}
            onApply={(roomId) => {
              setDraft({
                ...draft,
                placements: { ...draft.placements, [editedPerson.applicationTermId]: roomId },
              })
              setEditing(null)
            }}
          />
        ) : null}
        {dialog === "save" ? (
          <ConfirmProposalDialog
            title={t("roomProposal.saveTitle")}
            description={[
              t("roomProposal.saveAssignments", {
                count: Object.keys(draft.placements).length,
                term: formatDateRange(term.startsOn, term.endsOn, { shouldShowYear: true }),
              }),
              draft.unplaced.length > 0
                ? t("roomProposal.saveNoBed", { count: draft.unplaced.length })
                : null,
              unfulfilled > 0 ? t("roomProposal.saveWishes", { count: unfulfilled }) : null,
            ]
              .filter(Boolean)
              .join(" ")}
            confirmLabel={t("roomProposal.save")}
            isPending={save.isPending}
            error={save.error}
            onClose={() => setDialog(null)}
            onConfirm={() => void confirmSave()}
          />
        ) : null}
        {dialog === "discard" ? (
          <ConfirmProposalDialog
            title={t("roomProposal.discardTitle")}
            description={t("roomProposal.discardDescription")}
            confirmLabel={t("roomProposal.discard")}
            isDestructive
            onClose={() => setDialog(null)}
            onConfirm={() => {
              setDialog(null)
              setDraft(null)
            }}
          />
        ) : null}
      </>
    )
  }

  const action = canPropose ? (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="max-sm:w-full"
      disabled={propose.isPending}
      onClick={() => propose.mutate()}
    >
      {propose.isPending ? <Loader2 className="animate-spin" /> : null}
      {t(propose.isPending ? "roomProposal.creating" : "roomProposal.start")}
    </Button>
  ) : null
  const notices =
    propose.isPending || propose.isError || hasOnlyIndividual ? (
      <div className="mb-4 flex flex-col gap-4">
        {propose.isPending ? (
          <Alert>
            <TriangleAlert aria-hidden />
            <AlertTitle>{t("roomProposal.creatingTitle")}</AlertTitle>
            <AlertDescription>{t("roomProposal.creatingDescription")}</AlertDescription>
          </Alert>
        ) : null}
        {propose.isError ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertTitle>{t("roomProposal.failedTitle")}</AlertTitle>
            <AlertDescription>{t("roomProposal.failedDescription")}</AlertDescription>
          </Alert>
        ) : null}
        {hasOnlyIndividual ? (
          <Alert>
            <TriangleAlert aria-hidden />
            <AlertTitle>{t("roomProposal.nobodyTitle")}</AlertTitle>
            <AlertDescription>{t("roomProposal.nobodyDescription")}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    ) : null
  return <>{children({ action, notices })}</>
}
