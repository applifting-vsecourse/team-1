import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeFreeRoomBeds, computeRoomBeds } from "@/modules/applications/domain/capacity"
import {
  ApplicationTermStatus,
  ASSIGNABLE_STATUSES,
} from "@/modules/applications/domain/evaluation"
import {
  AssignmentOtherTerm,
  AssignmentParticipant,
  AssignmentRoom,
  findSameNamedRoom,
  rejectAssignment,
  TermAssignments,
} from "@/modules/events/domain/room-assignment"
import { AppException } from "@/shared/errors/app.exception"
import { releaseAssignments } from "@/shared/room-assignments/release-assignments"
import { HttpStatus, Injectable } from "@nestjs/common"

type TermScope = { eventId: string; termId: string; organizationId: string }

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

@Injectable()
export class RoomAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find({ eventId, termId, organizationId }: TermScope): Promise<TermAssignments> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, eventId, organizationId },
      include: {
        rooms: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          include: {
            assignments: {
              orderBy: { createdAt: "asc" },
              include: { applicationTerm: { include: { application: true } } },
            },
          },
        },
      },
    })
    if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")

    const waiting = await this.prisma.applicationTerm.findMany({
      where: {
        termId,
        organizationId,
        status: { in: [...ASSIGNABLE_STATUSES] },
        roomAssignment: null,
      },
      include: { application: true },
      orderBy: [{ application: { lastName: "asc" } }, { application: { firstName: "asc" } }],
    })

    // Other terms of the same applications where the same room could be assigned too (AC3).
    const others = await this.prisma.applicationTerm.findMany({
      where: {
        organizationId,
        applicationId: { in: waiting.map((row) => row.applicationId) },
        termId: { not: termId },
        status: { in: [...ASSIGNABLE_STATUSES] },
        roomAssignment: null,
        term: { eventId, cancelledAt: null },
      },
      include: {
        term: {
          include: {
            rooms: { include: { _count: { select: { assignments: true } } } },
          },
        },
      },
    })

    const toParticipant = (row: (typeof waiting)[number]): AssignmentParticipant => ({
      applicationTermId: row.id,
      applicationId: row.applicationId,
      firstName: row.application.firstName,
      lastName: row.application.lastName,
      gender: row.application.gender,
      status: row.status,
    })

    const rooms: AssignmentRoom[] = term.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      extraBeds: room.extraBeds,
      beds: computeRoomBeds(room),
      gender: room.gender,
      participants: room.assignments.map((assignment) => toParticipant(assignment.applicationTerm)),
    }))

    const unassigned = waiting.map((row) => ({
      ...toParticipant(row),
      alsoInTerms: others
        .filter((other) => other.applicationId === row.applicationId)
        .map(({ term: other }): AssignmentOtherTerm => ({
          termId: other.id,
          name: other.name,
          startsOn: isoDate(other.startsOn),
          endsOn: isoDate(other.endsOn),
          rooms: other.rooms.map((room) => ({
            id: room.id,
            name: room.name,
            gender: room.gender,
            freeBeds: computeFreeRoomBeds(room, room._count.assignments),
          })),
        })),
    }))

    return { eventId, termId, rooms, unassigned }
  }

  /** All writes share the event lock with rooms and evaluation, so two organizers never overfill a room. */
  private async write<T>(
    { eventId, termId, organizationId }: TermScope,
    action: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${eventId} AND "organizationId" = ${organizationId} FOR UPDATE`
      const term = await tx.term.findFirst({ where: { id: termId, eventId, organizationId } })
      if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      if (term.cancelledAt) throw new AppException(HttpStatus.CONFLICT, "TERM_CANCELLED")
      return action(tx)
    })
  }

  private async place(
    tx: Prisma.TransactionClient,
    application: { id: string; status: ApplicationTermStatus },
    room: { id: string; capacity: number; extraBeds: number },
    organizationId: string,
  ): Promise<void> {
    const [assignedCount, current] = await Promise.all([
      tx.roomAssignment.count({ where: { roomId: room.id } }),
      tx.roomAssignment.findUnique({ where: { applicationTermId: application.id } }),
    ])
    const rejection = rejectAssignment({
      status: application.status,
      room,
      assignedCount,
      alreadyInRoom: current?.roomId === room.id,
    })
    if (rejection) throw new AppException(HttpStatus.CONFLICT, rejection)
    await tx.roomAssignment.upsert({
      where: { applicationTermId: application.id },
      create: { organizationId, applicationTermId: application.id, roomId: room.id },
      update: { roomId: room.id },
    })
  }

  /**
   * Puts an application of the term into a room, moving it when it already sleeps elsewhere. With
   * `alsoTermIds` the same-named room of each other term of its application gets it too (AC3);
   * one transaction, so either all of them are placed or none.
   */
  async assign(
    scope: TermScope,
    applicationTermId: string,
    roomId: string,
    alsoTermIds: string[],
  ): Promise<void> {
    const { termId, organizationId } = scope
    await this.write(scope, async (tx) => {
      const application = await tx.applicationTerm.findFirst({
        where: { id: applicationTermId, termId, organizationId },
      })
      if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      const room = await tx.room.findFirst({ where: { id: roomId, organizationId } })
      if (!room) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      if (room.termId !== termId) throw new AppException(HttpStatus.CONFLICT, "ROOM_NOT_IN_TERM")
      await this.place(tx, application, room, organizationId)

      for (const otherTermId of new Set(alsoTermIds)) {
        if (otherTermId === termId) continue
        const other = await tx.applicationTerm.findFirst({
          where: {
            applicationId: application.applicationId,
            termId: otherTermId,
            organizationId,
            term: { eventId: scope.eventId },
          },
          include: { term: { include: { rooms: true } } },
        })
        if (!other) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
        if (other.term.cancelledAt) throw new AppException(HttpStatus.CONFLICT, "TERM_CANCELLED")
        const match = findSameNamedRoom(other.term.rooms, room.name)
        if (!match) {
          throw new AppException(HttpStatus.CONFLICT, "ROOM_ASSIGNMENT_NO_MATCHING_ROOM")
        }
        await this.place(tx, other, match, organizationId)
      }
    })
  }

  /** Takes the application out of its room; it returns to the unassigned. Not being in a room is fine. */
  async unassign(scope: TermScope, applicationTermId: string): Promise<void> {
    const { termId, organizationId } = scope
    await this.write(scope, async (tx) => {
      const application = await tx.applicationTerm.findFirst({
        where: { id: applicationTermId, termId, organizationId },
      })
      if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      await releaseAssignments(tx, { applicationTermId })
    })
  }
}
