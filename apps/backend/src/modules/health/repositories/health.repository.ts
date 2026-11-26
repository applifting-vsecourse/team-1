import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { OrganizerEditor } from "@/modules/applications/domain/application-scope"
import { logOrganizerEdit } from "@/modules/applications/repositories/application-edit-log"
import { HealthRecord } from "@/modules/health/domain/health"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

const select = {
  id: true,
  organizationId: true,
  firstName: true,
  lastName: true,
  event: { select: { name: true } },
  noHealthRestriction: true,
  health: { select: { note: true, consentAt: true } },
  changeRequests: {
    where: { kind: "HEALTH", status: "PENDING" },
    take: 1,
    select: { healthNote: true, createdAt: true },
  },
} as const

/** What the history says: the screen translates the tokens, the note itself is never stored there. */
export const HEALTH_WRITTEN = "WRITTEN"
export const HEALTH_NO_RESTRICTION = "NO_RESTRICTION"

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
    editor?: OrganizerEditor,
  ): Promise<void> {
    // The unique `applicationId` makes the first fill atomic: a concurrent second write fails
    // instead of overwriting data that is already filled in. The application row is locked first,
    // so it serializes with `confirmNoRestriction`.
    try {
      await this.prisma.$transaction(async (tx) => {
        await lockApplication(tx, applicationId)
        await tx.applicationHealth.create({
          data: { organizationId, applicationId, note, consentAt },
        })
        // A restriction entered later always cancels the "no restriction" confirmation (US-150).
        await tx.application.update({
          where: { id: applicationId },
          data: { noHealthRestriction: false },
        })
        if (editor) await this.logWritten(tx, organizationId, applicationId, editor, HEALTH_WRITTEN)
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppException(HttpStatus.CONFLICT, "HEALTH_CHANGE_REQUEST_REQUIRED")
      }
      throw error
    }
  }

  /** Removes the stored note and any "no restriction" confirmation in one step. */
  async clear(applicationId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await lockApplication(tx, applicationId)
      await tx.applicationHealth.deleteMany({ where: { applicationId } })
      await tx.application.update({
        where: { id: applicationId },
        data: { noHealthRestriction: false },
      })
    })
  }

  /**
   * Confirms "no restriction" (US-150) only while no note exists. Under the application row lock,
   * so a note saved meanwhile (another tab) wins and the confirmation is refused, never kept
   * next to a note.
   */
  async confirmNoRestriction(
    applicationId: string,
    editor?: { organizationId: string; editor: OrganizerEditor },
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await lockApplication(tx, applicationId)
      if ((await tx.applicationHealth.count({ where: { applicationId } })) > 0) {
        throw new AppException(HttpStatus.CONFLICT, "HEALTH_CHANGE_REQUEST_REQUIRED")
      }
      await tx.application.update({
        where: { id: applicationId },
        data: { noHealthRestriction: true },
      })
      if (editor) {
        await this.logWritten(
          tx,
          editor.organizationId,
          applicationId,
          editor.editor,
          HEALTH_NO_RESTRICTION,
        )
      }
    })
  }

  /** The history says that the organizer wrote it, never what (the note is sensitive, D-122). */
  private logWritten(
    tx: Prisma.TransactionClient,
    organizationId: string,
    applicationId: string,
    editor: OrganizerEditor,
    to: string,
  ) {
    return logOrganizerEdit(tx, {
      organizationId,
      applicationId,
      editor,
      field: "health",
      termId: null,
      from: null,
      to,
    })
  }

  async findOrganizationId(userId: string, applicationId: string): Promise<string | null> {
    const row = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      select: { organizationId: true },
    })
    return row?.organizationId ?? null
  }
}

/** `SELECT … FOR UPDATE` on the application row: concurrent health writes of it queue up. */
async function lockApplication(tx: Prisma.TransactionClient, applicationId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "application" WHERE id = ${applicationId} FOR UPDATE`
}

function toRecord(row: {
  id: string
  firstName: string
  lastName: string
  event: { name: string }
  noHealthRestriction: boolean
  health: { note: string; consentAt: Date } | null
  changeRequests: { healthNote: string | null; createdAt: Date }[]
}): HealthRecord {
  return {
    applicationId: row.id,
    eventName: row.event.name,
    firstName: row.firstName,
    lastName: row.lastName,
    note: row.health?.note ?? null,
    // Never reported next to a note, even if the two were ever stored together.
    noRestriction: row.noHealthRestriction && row.health === null,
    consentAt: row.health?.consentAt ?? null,
    pendingRequest: row.changeRequests[0]
      ? { note: row.changeRequests[0].healthNote ?? "", createdAt: row.changeRequests[0].createdAt }
      : null,
  }
}
