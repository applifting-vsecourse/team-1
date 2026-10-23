import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { EventRooms, RoomInput, RoomMode } from "@/modules/events/domain/rooms"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(eventId: string, organizationId: string): Promise<Omit<EventRooms, "capacity">> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizationId },
      include: {
        organization: { select: { name: true } },
        rooms: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
        _count: { select: { terms: true } },
      },
    })
    if (!event) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return {
      eventId: event.id,
      eventName: event.name,
      organizationName: event.organization.name,
      roomMode: event.roomMode,
      termCount: event._count.terms,
      rooms: event.rooms.map(({ id, name, capacity, gender }) => ({ id, name, capacity, gender })),
    } satisfies Omit<EventRooms, "capacity">
  }

  /** All room writes and submissions share this event lock; no capacity snapshot can race a write. */
  private async write<T>(
    eventId: string,
    organizationId: string,
    action: (tx: Prisma.TransactionClient, mode: RoomMode) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${eventId} AND "organizationId" = ${organizationId} FOR UPDATE`
      const event = await tx.event.findFirst({ where: { id: eventId, organizationId } })
      if (!event) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      return action(tx, event.roomMode)
    })
  }

  async setMode(eventId: string, organizationId: string, roomMode: RoomMode): Promise<void> {
    await this.write(eventId, organizationId, async (tx, current) => {
      if (current === roomMode) return
      if (
        roomMode === "GENDERED" &&
        (await tx.room.count({ where: { eventId, organizationId } }))
      ) {
        throw new AppException(HttpStatus.CONFLICT, "ROOM_MODE_REQUIRES_EMPTY_ROOMS")
      }
      await tx.room.updateMany({ where: { eventId, organizationId }, data: { gender: null } })
      await tx.event.update({ where: { id: eventId }, data: { roomMode } })
    })
  }

  async save(
    eventId: string,
    organizationId: string,
    input: RoomInput,
    id?: string,
  ): Promise<void> {
    await this.write(eventId, organizationId, async (tx, mode) => {
      if ((mode === "GENDERED") !== (input.gender !== null)) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }
      if (id && !(await tx.room.findFirst({ where: { id, eventId, organizationId } }))) {
        throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      }
      const duplicate = await tx.room.findFirst({
        where: {
          eventId,
          organizationId,
          name: { equals: input.name, mode: "insensitive" },
          ...(id ? { id: { not: id } } : {}),
        },
      })
      if (duplicate) throw new AppException(HttpStatus.CONFLICT, "ROOM_NAME_TAKEN")
      if (id) await tx.room.update({ where: { id }, data: input })
      else await tx.room.create({ data: { ...input, eventId, organizationId } })
    })
  }

  async remove(eventId: string, organizationId: string, id: string): Promise<void> {
    await this.write(eventId, organizationId, async (tx) => {
      const result = await tx.room.deleteMany({ where: { id, eventId, organizationId } })
      if (!result.count) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    })
  }
}
