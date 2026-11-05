import { PrismaService } from "@/core/prisma/prisma.service"
import { DecisionCandidate } from "@/modules/applications/domain/bulk-decision"
import { Injectable } from "@nestjs/common"

@Injectable()
export class BulkDecisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null when the term is not a term of the event; else the selected applications of the term. */
  async findCandidates(
    organizationId: string,
    eventId: string,
    termId: string,
    applicationIds: string[],
  ): Promise<DecisionCandidate[] | null> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, eventId, organizationId },
      select: { id: true },
    })
    if (!term) return null
    const rows = await this.prisma.applicationTerm.findMany({
      where: {
        organizationId,
        termId,
        applicationId: { in: applicationIds },
        application: { eventId },
      },
      select: {
        status: true,
        application: { select: { id: true, number: true, submittedAt: true } },
      },
    })
    return rows.map(({ status, application }) => ({
      applicationId: application.id,
      status,
      number: application.number,
      submittedAt: application.submittedAt,
    }))
  }
}
