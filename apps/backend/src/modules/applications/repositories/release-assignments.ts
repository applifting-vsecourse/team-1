import { Prisma } from "@/generated/prisma/client"

/**
 * Releases the room of an application in a term (or of every application in a term) — the one place
 * that every change of status or term and every term cancellation calls, so no one keeps a bed
 * they no longer hold.
 */
export async function releaseAssignments(
  tx: Prisma.TransactionClient,
  where: { applicationTermId: string } | { termId: string },
): Promise<void> {
  if ("applicationTermId" in where) {
    await tx.roomAssignment.deleteMany({ where: { applicationTermId: where.applicationTermId } })
  } else {
    await tx.roomAssignment.deleteMany({ where: { room: { termId: where.termId } } })
  }
}
