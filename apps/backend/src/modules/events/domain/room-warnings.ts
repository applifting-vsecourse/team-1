import { computeRoomBeds } from "@/modules/applications/domain/capacity"
import { Gender } from "@/shared/domain/gender"

export type RoomWarningKind = "OVERCROWDED" | "MIXED_GENDER" | "CONFIRMED_WITHOUT_BED"

/** A warning is about a room (the first two kinds) or about an application in the term. */
export type RoomWarningSubject = { roomId: string } | { applicationTermId: string }

export type RoomWarningAcknowledgement = {
  kind: RoomWarningKind
  roomId: string | null
  applicationTermId: string | null
  note: string
  acknowledgedAt: Date
  /** Who confirmed it, as the organizer is named in the app. */
  acknowledgedBy: string
}

export type RoomWarning = {
  kind: RoomWarningKind
  roomId: string | null
  applicationTermId: string | null
  /** Knowingly confirmed by an organizer (AC4): shown muted, not counted. */
  acknowledged: boolean
  note: string | null
  acknowledgedAt: Date | null
  acknowledgedBy: string | null
}

export type RoomWarningsSummary = {
  /** Room rules (overcrowded, mixed gender) broken and not knowingly confirmed. */
  violations: number
  /** Warnings of any kind an organizer confirmed knowingly; not counted above. */
  acknowledged: number
  /** Confirmed applications without a bed, not confirmed knowingly. */
  confirmedWithoutBed: number
}

export type RoomWarningsInput = {
  rooms: { id: string; capacity: number; extraBeds: number; gender: Gender | null }[]
  assignments: {
    roomId: string
    applicationTermId: string
    gender: Gender
    /** Asked to settle the accommodation individually (US-38): not counted as mixed gender. */
    individualAccommodation: boolean
  }[]
  /** Confirmed applications of the term that sleep in no room. */
  confirmedWithoutRoom: { applicationTermId: string }[]
  acknowledgements: RoomWarningAcknowledgement[]
}

const sameSubject = (
  warning: Pick<RoomWarning, "kind" | "roomId" | "applicationTermId">,
  ack: RoomWarningAcknowledgement,
): boolean =>
  warning.kind === ack.kind &&
  warning.roomId === ack.roomId &&
  warning.applicationTermId === ack.applicationTermId

/**
 * The rules of the rooms (US-37, D-112), the only place that evaluates them. They only warn, they
 * block nothing:
 * - a room holds more people than beds (extra beds included), e.g. after an extra bed was taken away;
 * - a room with a set gender holds the other gender (rooms without a gender, the shared mode, never
 *   warn; an applicant with a request for individual accommodation, US-38, is not counted, since
 *   partners and families are meant to share a room);
 * - a confirmed application has no bed, but only once the term has at least one assignment, since
 *   assigning is optional.
 * An acknowledgement counts only while its warning still holds, so one that went away is forgotten.
 */
export function computeRoomWarnings(input: RoomWarningsInput): {
  warnings: RoomWarning[]
  summary: RoomWarningsSummary
} {
  const found: Pick<RoomWarning, "kind" | "roomId" | "applicationTermId">[] = []

  for (const room of input.rooms) {
    const inRoom = input.assignments.filter((assignment) => assignment.roomId === room.id)
    if (inRoom.length > computeRoomBeds(room)) {
      found.push({ kind: "OVERCROWDED", roomId: room.id, applicationTermId: null })
    }
    if (
      room.gender !== null &&
      inRoom.some(
        (assignment) => !assignment.individualAccommodation && assignment.gender !== room.gender,
      )
    ) {
      found.push({ kind: "MIXED_GENDER", roomId: room.id, applicationTermId: null })
    }
  }
  if (input.assignments.length > 0) {
    for (const { applicationTermId } of input.confirmedWithoutRoom) {
      found.push({ kind: "CONFIRMED_WITHOUT_BED", roomId: null, applicationTermId })
    }
  }

  const warnings = found.map((warning): RoomWarning => {
    const ack = input.acknowledgements.find((item) => sameSubject(warning, item))
    return {
      ...warning,
      acknowledged: ack !== undefined,
      note: ack?.note ?? null,
      acknowledgedAt: ack?.acknowledgedAt ?? null,
      acknowledgedBy: ack?.acknowledgedBy ?? null,
    }
  })
  const open = warnings.filter((warning) => !warning.acknowledged)
  const isWithoutBed = (warning: RoomWarning) => warning.kind === "CONFIRMED_WITHOUT_BED"
  return {
    warnings,
    summary: {
      // Two figures of the summary (AC3): broken room rules, and confirmed people without a bed.
      violations: open.filter((warning) => !isWithoutBed(warning)).length,
      acknowledged: warnings.length - open.length,
      confirmedWithoutBed: open.filter(isWithoutBed).length,
    },
  }
}
