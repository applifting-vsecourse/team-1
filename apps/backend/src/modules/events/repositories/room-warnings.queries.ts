import { Prisma } from "@/generated/prisma/client"
import {
  computeRoomWarnings,
  RoomWarning,
  RoomWarningAcknowledgement,
  RoomWarningsSummary,
} from "@/modules/events/domain/room-warnings"

type Db = Prisma.TransactionClient

/** Loads what the room rules need for one term and computes the warnings (US-37). */
export async function loadRoomWarnings(
  db: Db,
  { termId, organizationId }: { termId: string; organizationId: string },
): Promise<{ warnings: RoomWarning[]; summary: RoomWarningsSummary }> {
  const [rooms, assignments, confirmed, stored] = await Promise.all([
    db.room.findMany({ where: { termId, organizationId } }),
    db.roomAssignment.findMany({
      where: { room: { termId }, organizationId },
      include: { applicationTerm: { include: { application: true } } },
    }),
    // "To evaluate" people are assignable but not confirmed, so they never lack a bed.
    db.applicationTerm.findMany({
      where: { termId, organizationId, status: "CONFIRMED", roomAssignment: null },
      select: { id: true },
    }),
    db.roomWarningAcknowledgement.findMany({ where: { termId, organizationId } }),
  ])
  const acknowledgements: RoomWarningAcknowledgement[] = stored.map((row) => ({
    kind: row.kind,
    roomId: row.roomId,
    applicationTermId: row.applicationTermId,
    note: row.note,
    acknowledgedAt: row.createdAt,
    acknowledgedBy: row.acknowledgedByName,
  }))
  return computeRoomWarnings({
    rooms,
    assignments: assignments.map((assignment) => ({
      roomId: assignment.roomId,
      applicationTermId: assignment.applicationTermId,
      gender: assignment.applicationTerm.application.gender,
    })),
    confirmedWithoutRoom: confirmed.map((row) => ({ applicationTermId: row.id })),
    acknowledgements,
  })
}

/**
 * Forgets the confirmations whose warning no longer holds, so a confirmation belongs to the one
 * warning it was made for and a warning that comes back later is a new one. Runs in the same
 * transaction as every change of rooms and assignments.
 */
export async function pruneAcknowledgements(
  db: Db,
  scope: { termId: string; organizationId: string },
): Promise<void> {
  const { warnings } = await loadRoomWarnings(db, scope)
  const stale = (
    await db.roomWarningAcknowledgement.findMany({
      where: { termId: scope.termId, organizationId: scope.organizationId },
    })
  ).filter(
    (ack) =>
      !warnings.some(
        (warning) =>
          warning.kind === ack.kind &&
          warning.roomId === ack.roomId &&
          warning.applicationTermId === ack.applicationTermId,
      ),
  )
  if (stale.length) {
    await db.roomWarningAcknowledgement.deleteMany({
      where: { id: { in: stale.map((ack) => ack.id) } },
    })
  }
}
