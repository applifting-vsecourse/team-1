import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { RoomGenderAssignment, RoomInput, RoomMode, TermRooms } from "@/modules/events/domain/rooms"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

type TermScope = { eventId: string; termId: string; organizationId: string }

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find({ eventId, termId, organizationId }: TermScope): Promise<Omit<TermRooms, "capacity">> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, eventId, organizationId },
      include: {
        event: { select: { name: true, organization: { select: { name: true } } } },
        rooms: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      },
    })
    if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return {
      eventId,
      eventName: term.event.name,
      organizationName: term.event.organization.name,
      termId: term.id,
      termName: term.name,
      startsOn: term.startsOn.toISOString().slice(0, 10),
      endsOn: term.endsOn.toISOString().slice(0, 10),
      roomMode: term.roomMode,
      rooms: term.rooms.map(({ id, name, capacity, gender }) => ({ id, name, capacity, gender })),
    }
  }

  /** All room writes and submissions share this event lock; no capacity snapshot can race a write. */
  private async write<T>(
    { eventId, termId, organizationId }: TermScope,
    action: (tx: Prisma.TransactionClient, mode: RoomMode) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${eventId} AND "organizationId" = ${organizationId} FOR UPDATE`
      const term = await tx.term.findFirst({ where: { id: termId, eventId, organizationId } })
      if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      return action(tx, term.roomMode)
    })
  }

  /**
   * Switches the term's room mode. Gendered rooms need a gender on every room, so the switch to
   * them carries one per existing room; shared rooms have none.
   */
  async setMode(
    scope: TermScope,
    roomMode: RoomMode,
    assignments: RoomGenderAssignment[],
  ): Promise<void> {
    const { termId, organizationId } = scope
    await this.write(scope, async (tx, current) => {
      if (current === roomMode) return
      if (roomMode === "GENDERED") {
        const rooms = await tx.room.findMany({ where: { termId, organizationId } })
        const genders = new Map(assignments.map(({ id, gender }) => [id, gender]))
        if (rooms.some((room) => !genders.has(room.id))) {
          throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
        }
        for (const room of rooms) {
          await tx.room.update({ where: { id: room.id }, data: { gender: genders.get(room.id) } })
        }
      } else {
        await tx.room.updateMany({ where: { termId, organizationId }, data: { gender: null } })
      }
      await tx.term.update({ where: { id: termId }, data: { roomMode } })
    })
  }

  async save(scope: TermScope, input: RoomInput, id?: string): Promise<void> {
    const { termId, organizationId } = scope
    await this.write(scope, async (tx, mode) => {
      if ((mode === "GENDERED") !== (input.gender !== null)) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }
      if (id && !(await tx.room.findFirst({ where: { id, termId, organizationId } }))) {
        throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      }
      const duplicate = await tx.room.findFirst({
        where: {
          termId,
          organizationId,
          name: { equals: input.name, mode: "insensitive" },
          ...(id ? { id: { not: id } } : {}),
        },
      })
      if (duplicate) throw new AppException(HttpStatus.CONFLICT, "ROOM_NAME_TAKEN")
      if (id) await tx.room.update({ where: { id }, data: input })
      else await tx.room.create({ data: { ...input, termId, organizationId } })
    })
  }

  async remove(scope: TermScope, id: string): Promise<void> {
    const { termId, organizationId } = scope
    await this.write(scope, async (tx) => {
      const result = await tx.room.deleteMany({ where: { id, termId, organizationId } })
      if (!result.count) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    })
  }
}
