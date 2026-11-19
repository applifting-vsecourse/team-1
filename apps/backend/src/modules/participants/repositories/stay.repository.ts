import { PrismaService } from "@/core/prisma/prisma.service"
import { Injectable } from "@nestjs/common"

export type StayTarget =
  | { kind: "NOT_FOUND" }
  /** Cancelled or archived in the term, or the term itself was cancelled. */
  | { kind: "NOT_AVAILABLE" }
  | { kind: "OK"; id: string; startsOn: Date; endsOn: Date }

/** The only place that reads or writes the arrival and departure of a participant's term. */
@Injectable()
export class StayRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Finds the participant's own application in the term; someone else's looks like a missing one. */
  async findTarget(userId: string, applicationId: string, termId: string): Promise<StayTarget> {
    const row = await this.prisma.applicationTerm.findFirst({
      where: { applicationId, termId, application: { userId } },
      select: {
        id: true,
        status: true,
        term: { select: { cancelledAt: true, startsOn: true, endsOn: true } },
      },
    })
    if (!row) return { kind: "NOT_FOUND" }
    if (row.status === "CANCELLED" || row.status === "ARCHIVED" || row.term.cancelledAt) {
      return { kind: "NOT_AVAILABLE" }
    }
    return { kind: "OK", id: row.id, startsOn: row.term.startsOn, endsOn: row.term.endsOn }
  }

  async save(
    applicationTermId: string,
    lateArrivalAt: Date | null,
    earlyDepartureAt: Date | null,
  ): Promise<void> {
    await this.prisma.applicationTerm.update({
      where: { id: applicationTermId },
      data: { lateArrivalAt, earlyDepartureAt },
    })
  }
}
