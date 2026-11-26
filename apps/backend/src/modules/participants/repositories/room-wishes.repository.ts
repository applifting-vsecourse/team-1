import { PrismaService } from "@/core/prisma/prisma.service"
import { ApplicationScope, OrganizerEditor } from "@/modules/applications/domain/application-scope"
import { logOrganizerEdit } from "@/modules/applications/repositories/application-edit-log"
import { Injectable } from "@nestjs/common"

export type RoomWishesTarget =
  | { kind: "NOT_FOUND" }
  | { kind: "TERM_CANCELLED" }
  | { kind: "NOT_AVAILABLE" }
  | {
      kind: "OK"
      id: string
      organizationId: string
      applicationId: string
      termId: string
      names: string[]
      noRoomWishes: boolean
    }

type Target = Extract<RoomWishesTarget, { kind: "OK" }>

/** The history says "no wishes" with this token, the screen translates it. */
export const NO_ROOM_WISHES = "NO_WISHES"

const historyValue = (names: string[], noRoomWishes: boolean): string | null =>
  names.length > 0 ? names.join(", ") : noRoomWishes ? NO_ROOM_WISHES : null

/** The only place that reads or writes the roommate wishes of a participant's term. */
@Injectable()
export class RoomWishesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Finds the application in the term within `scope`; someone else's looks like a missing one. */
  async findTarget(
    scope: ApplicationScope,
    applicationId: string,
    termId: string,
  ): Promise<RoomWishesTarget> {
    const row = await this.prisma.applicationTerm.findFirst({
      where: { applicationId, termId, application: scope },
      select: {
        id: true,
        status: true,
        organizationId: true,
        roomWishes: true,
        noRoomWishes: true,
        application: { select: { individualAccommodation: true } },
        term: { select: { cancelledAt: true } },
      },
    })
    if (!row) return { kind: "NOT_FOUND" }
    if (row.term.cancelledAt) return { kind: "TERM_CANCELLED" }
    // No room is arranged for an individually accommodated participant (US-38), so no wishes.
    if (row.status !== "CONFIRMED" || row.application.individualAccommodation)
      return { kind: "NOT_AVAILABLE" }
    return {
      kind: "OK",
      id: row.id,
      organizationId: row.organizationId,
      applicationId,
      termId,
      names: row.roomWishes,
      noRoomWishes: row.noRoomWishes,
    }
  }

  /** A stale step cannot overwrite names or resolve the step after publication. */
  async decline(
    target: Target,
    scope: ApplicationScope,
    editor?: OrganizerEditor,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.applicationTerm.updateMany({
        where: {
          id: target.id,
          status: "CONFIRMED",
          roomWishes: { isEmpty: true },
          application: { ...scope, individualAccommodation: false },
          term: { cancelledAt: null, roomsPublishedAt: null },
        },
        data: { noRoomWishes: true },
      })
      if (count > 0 && editor) await this.log(tx, target, editor, [], true)
      return count > 0
    })
  }

  async save(target: Target, names: string[], editor?: OrganizerEditor): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.applicationTerm.update({
        where: { id: target.id },
        data: { roomWishes: names, noRoomWishes: false },
      })
      if (editor) await this.log(tx, target, editor, names, false)
    })
  }

  private log(
    tx: Parameters<Parameters<PrismaService["$transaction"]>[0]>[0],
    target: Target,
    editor: OrganizerEditor,
    names: string[],
    noRoomWishes: boolean,
  ) {
    return logOrganizerEdit(tx, {
      organizationId: target.organizationId,
      applicationId: target.applicationId,
      editor,
      field: "roomWishes",
      termId: target.termId,
      from: historyValue(target.names, target.noRoomWishes),
      to: historyValue(names, noRoomWishes),
    })
  }
}
