import { PrismaService } from "@/core/prisma/prisma.service"
import { Injectable } from "@nestjs/common"

export type RoomWishesTarget =
  | { kind: "NOT_FOUND" }
  | { kind: "TERM_CANCELLED" }
  | { kind: "NOT_AVAILABLE" }
  | { kind: "OK"; id: string }

/** The only place that reads or writes the roommate wishes of a participant's term. */
@Injectable()
export class RoomWishesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Finds the participant's own application in the term; someone else's looks like a missing one. */
  async findTarget(
    userId: string,
    applicationId: string,
    termId: string,
  ): Promise<RoomWishesTarget> {
    const row = await this.prisma.applicationTerm.findFirst({
      where: { applicationId, termId, application: { userId } },
      select: {
        id: true,
        status: true,
        application: { select: { individualAccommodation: true } },
        term: { select: { cancelledAt: true } },
      },
    })
    if (!row) return { kind: "NOT_FOUND" }
    if (row.term.cancelledAt) return { kind: "TERM_CANCELLED" }
    // No room is arranged for an individually accommodated participant (US-38), so no wishes.
    if (row.status !== "CONFIRMED" || row.application.individualAccommodation)
      return { kind: "NOT_AVAILABLE" }
    return { kind: "OK", id: row.id }
  }

  /** A stale step cannot overwrite names or resolve the step after publication. */
  async decline(applicationTermId: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.applicationTerm.updateMany({
      where: {
        id: applicationTermId,
        status: "CONFIRMED",
        roomWishes: { isEmpty: true },
        application: { userId, individualAccommodation: false },
        term: { cancelledAt: null, roomsPublishedAt: null },
      },
      data: { noRoomWishes: true },
    })
    return count > 0
  }

  async save(applicationTermId: string, names: string[]): Promise<void> {
    await this.prisma.applicationTerm.update({
      where: { id: applicationTermId },
      data: { roomWishes: names, noRoomWishes: false },
    })
  }
}
