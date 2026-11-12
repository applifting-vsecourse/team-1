import { PrismaService } from "@/core/prisma/prisma.service"
import { BulkCandidate } from "@/modules/applications/domain/bulk-confirmation"
import { RoomCapacity } from "@/modules/applications/domain/capacity"
import { Gender } from "@/shared/domain/gender"
import { Injectable } from "@nestjs/common"

export type BulkTermState = {
  rooms: RoomCapacity[]
  confirmedGenders: Gender[]
  /** The selected applications that are still waiting for evaluation in the term. */
  candidates: (BulkCandidate & { firstName: string; lastName: string })[]
}

@Injectable()
export class BulkConfirmationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null when the term is not a term of the event. */
  async findTermState(
    organizationId: string,
    eventId: string,
    termId: string,
    applicationIds: string[],
  ): Promise<BulkTermState | null> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, eventId, organizationId },
      select: { id: true },
    })
    if (!term) return null
    const [rooms, confirmed, waiting] = await Promise.all([
      this.prisma.room.findMany({
        where: { termId },
        select: { capacity: true, extraBeds: true, gender: true },
      }),
      this.prisma.applicationTerm.findMany({
        where: { organizationId, termId, status: "CONFIRMED" },
        select: { application: { select: { gender: true } } },
      }),
      this.prisma.applicationTerm.findMany({
        where: {
          organizationId,
          termId,
          status: "TO_EVALUATE",
          applicationId: { in: applicationIds },
          application: { eventId },
        },
        select: {
          application: {
            select: {
              id: true,
              number: true,
              firstName: true,
              lastName: true,
              gender: true,
              submittedAt: true,
            },
          },
        },
      }),
    ])
    return {
      rooms,
      confirmedGenders: confirmed.map((row) => row.application.gender),
      candidates: waiting.map(({ application }) => ({
        applicationId: application.id,
        number: application.number,
        firstName: application.firstName,
        lastName: application.lastName,
        gender: application.gender,
        submittedAt: application.submittedAt,
      })),
    }
  }
}
