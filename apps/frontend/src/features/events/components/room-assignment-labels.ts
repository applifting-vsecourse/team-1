import { useTranslation } from "react-i18next"

import type { AssignmentParticipant, AssignmentRoom } from "@/features/events/api/room-assignments"

type Gender = "FEMALE" | "MALE"

/** Free beds of a room, extra beds included. Never negative: an overfilled room is just full. */
export const freeBedCount = (room: Pick<AssignmentRoom, "beds" | "participants">): number =>
  Math.max(0, room.beds - room.participants.length)

export const participantName = (
  participant: Pick<AssignmentParticipant, "firstName" | "lastName">,
): string => `${participant.firstName} ${participant.lastName}`

export const participantInitials = (
  participant: Pick<AssignmentParticipant, "firstName" | "lastName">,
): string => `${participant.firstName.charAt(0)}${participant.lastName.charAt(0)}`.toUpperCase()

/**
 * Rooms in the order the assignment dialog offers them: rooms of the participant's gender first,
 * then rooms without a gender, then rooms of the other gender; within a group the most free beds
 * first (full rooms last), ties by room name.
 */
export function sortRoomsForAssignment<
  T extends Pick<AssignmentRoom, "name" | "gender" | "beds" | "participants">,
>(rooms: readonly T[], gender: Gender): T[] {
  const group = (room: T): number => (room.gender === gender ? 0 : room.gender === null ? 1 : 2)
  return [...rooms].sort(
    (a, b) =>
      group(a) - group(b) ||
      freeBedCount(b) - freeBedCount(a) ||
      a.name.localeCompare(b.name, "cs", { numeric: true }),
  )
}

const normalize = (name: string): string => name.trim().toLocaleLowerCase("cs")
export const sameRoomName = (a: string, b: string): boolean => normalize(a) === normalize(b)

/** Texts of the room assignment that several components share. */
export function useAssignmentLabels() {
  const { t } = useTranslation("events")
  const genderLabel = (gender: Gender): string =>
    t(gender === "FEMALE" ? "roomAssignments.female" : "roomAssignments.male")
  const roomGenderLabel = (gender: Gender): string =>
    t(gender === "FEMALE" ? "rooms.female" : "rooms.male")
  const roomTitle = (room: Pick<AssignmentRoom, "name" | "gender" | "extraBeds">): string =>
    [
      room.name,
      room.gender ? roomGenderLabel(room.gender) : null,
      room.extraBeds > 0 ? t("roomAssignments.extraBeds", { count: room.extraBeds }) : null,
    ]
      .filter(Boolean)
      .join(" · ")
  return {
    genderLabel,
    roomGenderLabel,
    roomTitle,
    statusLabel: (status: AssignmentParticipant["status"]): string =>
      t(
        status === "TO_EVALUATE"
          ? "roomAssignments.statusToEvaluate"
          : "roomAssignments.statusConfirmed",
      ),
    freeBedsLabel: (room: Pick<AssignmentRoom, "beds" | "participants">): string => {
      const free = freeBedCount(room)
      return free === 0 ? t("roomAssignments.full") : t("roomAssignments.freeBeds", { count: free })
    },
  }
}
