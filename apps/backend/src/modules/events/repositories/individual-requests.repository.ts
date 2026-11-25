import { PrismaService } from "@/core/prisma/prisma.service"
import {
  INDIVIDUAL_REQUEST_EXCLUDED_STATUSES,
  IndividualRequest,
} from "@/modules/events/domain/individual-request"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class IndividualRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(scope: {
    eventId: string
    termId: string
    organizationId: string
  }): Promise<IndividualRequest[]> {
    const { eventId, termId, organizationId } = scope
    const term = await this.prisma.term.findFirst({
      where: { id: termId, eventId, organizationId },
      select: { id: true },
    })
    if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const rows = await this.prisma.applicationTerm.findMany({
      where: {
        termId,
        organizationId,
        status: { notIn: [...INDIVIDUAL_REQUEST_EXCLUDED_STATUSES] },
        application: { individualAccommodation: true },
      },
      include: { application: true },
      orderBy: [{ application: { lastName: "asc" } }, { application: { firstName: "asc" } }],
    })
    return rows.map((row) => ({
      applicationTermId: row.id,
      applicationId: row.applicationId,
      firstName: row.application.firstName,
      lastName: row.application.lastName,
      status: row.status,
      request: row.application.accommodationRequest?.trim() || null,
    }))
  }
}
