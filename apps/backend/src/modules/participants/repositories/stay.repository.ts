import { PrismaService } from "@/core/prisma/prisma.service"
import { ApplicationScope, OrganizerEditor } from "@/modules/applications/domain/application-scope"
import { logOrganizerEdit } from "@/modules/applications/repositories/application-edit-log"
import { canWriteStay } from "@/modules/participants/domain/arrangement-rules"
import { Injectable } from "@nestjs/common"

export type StayTarget =
  | { kind: "NOT_FOUND" }
  /** Cancelled or archived in the term, or the term itself was cancelled. */
  | { kind: "NOT_AVAILABLE" }
  | {
      kind: "OK"
      id: string
      organizationId: string
      applicationId: string
      termId: string
      startsOn: Date
      endsOn: Date
      /** The stored values before the write, for the history. */
      current: { lateArrivalAt: Date | null; earlyDepartureAt: Date | null }
    }

/** What is written to the history of the application when an organizer writes the stay. */
const historyValue = (arrival: Date | null, departure: Date | null): string | null =>
  arrival || departure ? `${arrival?.toISOString() ?? ""}|${departure?.toISOString() ?? ""}` : null

/** The only place that reads or writes the arrival and departure of a participant's term. */
@Injectable()
export class StayRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Finds the application in the term within `scope`; someone else's looks like a missing one. */
  async findTarget(
    scope: ApplicationScope,
    applicationId: string,
    termId: string,
  ): Promise<StayTarget> {
    const row = await this.prisma.applicationTerm.findFirst({
      where: { applicationId, termId, application: scope },
      select: {
        id: true,
        status: true,
        organizationId: true,
        lateArrivalAt: true,
        earlyDepartureAt: true,
        term: { select: { cancelledAt: true, startsOn: true, endsOn: true } },
      },
    })
    if (!row) return { kind: "NOT_FOUND" }
    if (!canWriteStay({ status: row.status, termCancelled: row.term.cancelledAt !== null })) {
      return { kind: "NOT_AVAILABLE" }
    }
    return {
      kind: "OK",
      id: row.id,
      organizationId: row.organizationId,
      applicationId,
      termId,
      startsOn: row.term.startsOn,
      endsOn: row.term.endsOn,
      current: { lateArrivalAt: row.lateArrivalAt, earlyDepartureAt: row.earlyDepartureAt },
    }
  }

  /** `editor` is set when an organizer writes it: the history then says who. */
  async save(
    target: Extract<StayTarget, { kind: "OK" }>,
    lateArrivalAt: Date | null,
    earlyDepartureAt: Date | null,
    editor?: OrganizerEditor,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.applicationTerm.update({
        where: { id: target.id },
        data: { lateArrivalAt, earlyDepartureAt },
      })
      if (editor) {
        await logOrganizerEdit(tx, {
          organizationId: target.organizationId,
          applicationId: target.applicationId,
          editor,
          field: "stay",
          termId: target.termId,
          from: historyValue(target.current.lateArrivalAt, target.current.earlyDepartureAt),
          to: historyValue(lateArrivalAt, earlyDepartureAt),
        })
      }
    })
  }
}
