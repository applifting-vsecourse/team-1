import { PrismaService } from "@/core/prisma/prisma.service"
import { HealthRecord } from "@/modules/health/domain/health"
import { Injectable } from "@nestjs/common"

const select = {
  id: true,
  organizationId: true,
  firstName: true,
  lastName: true,
  event: { select: { name: true } },
  health: { select: { note: true, consentAt: true } },
  changeRequests: {
    where: { kind: "HEALTH", status: "PENDING" },
    take: 1,
    select: { healthNote: true, createdAt: true },
  },
} as const

/** The only place of the health restriction that touches the database. */
@Injectable()
export class HealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** `null` when the application does not exist or is not attached to this account. */
  async findOfUser(userId: string, applicationId: string): Promise<HealthRecord | null> {
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      select,
    })
    return row ? toRecord(row) : null
  }

  /** For the organizer; the caller has already checked the organization's access. */
  async findOfOrganization(
    organizationId: string,
    applicationId: string,
  ): Promise<HealthRecord | null> {
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId, organizationId },
      select,
    })
    return row ? toRecord(row) : null
  }

  async save(
    organizationId: string,
    applicationId: string,
    note: string,
    consentAt: Date,
  ): Promise<void> {
    await this.prisma.applicationHealth.upsert({
      where: { applicationId },
      create: { organizationId, applicationId, note, consentAt },
      update: { note, consentAt },
    })
  }

  async clear(applicationId: string): Promise<void> {
    await this.prisma.applicationHealth.deleteMany({ where: { applicationId } })
  }

  async findOrganizationId(userId: string, applicationId: string): Promise<string | null> {
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      select: { organizationId: true },
    })
    return row?.organizationId ?? null
  }
}

function toRecord(row: {
  id: string
  firstName: string
  lastName: string
  event: { name: string }
  health: { note: string; consentAt: Date } | null
  changeRequests: { healthNote: string | null; createdAt: Date }[]
}): HealthRecord {
  return {
    applicationId: row.id,
    eventName: row.event.name,
    firstName: row.firstName,
    lastName: row.lastName,
    note: row.health?.note ?? null,
    consentAt: row.health?.consentAt ?? null,
    pendingRequest: row.changeRequests[0]
      ? { note: row.changeRequests[0].healthNote ?? "", createdAt: row.changeRequests[0].createdAt }
      : null,
  }
}
