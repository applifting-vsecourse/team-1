import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeRoomBeds } from "@/modules/applications/domain/capacity"
import { ROOM_CAPACITY_SELECT } from "@/modules/applications/repositories/room-capacity.select"
import { BulkRoomsPlan, BulkRoomsResult, planBulkRooms } from "@/modules/events/domain/bulk-rooms"
import {
  RoomCopyStrategy,
  RoomGenderAssignment,
  RoomInput,
  RoomMode,
  TermRooms,
} from "@/modules/events/domain/rooms"
import { pruneAcknowledgements } from "@/modules/events/repositories/room-warnings.queries"
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
        rooms: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          // Who sleeps in an individual room counts into the capacity by gender (US-145).
          include: { assignments: ROOM_CAPACITY_SELECT.assignments },
        },
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
      roomsPublished: term.roomsPublishedAt !== null,
      rooms: term.rooms.map(
        ({ id, name, capacity, extraBeds, gender, individual, assignments }) => ({
          id,
          name,
          capacity,
          extraBeds,
          beds: computeRoomBeds({ capacity, extraBeds }),
          gender,
          individual,
          assignments,
        }),
      ),
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
      const result = await action(tx, term.roomMode)
      await pruneAcknowledgements(tx, { termId, organizationId })
      return result
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
        // Individual rooms keep no gender (US-145).
        const rooms = await tx.room.findMany({
          where: { termId, organizationId, individual: false },
        })
        const genders = new Map(assignments.map(({ id, gender }) => [id, gender]))
        if (rooms.some((room) => !genders.has(room.id))) {
          throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
        }
        for (const room of rooms) {
          await tx.room.update({ where: { id: room.id }, data: { gender: genders.get(room.id) } })
        }
      } else {
        // The shared mode has no individual rooms: they become ordinary shared rooms (US-145).
        await tx.room.updateMany({
          where: { termId, organizationId },
          data: { gender: null, individual: false },
        })
      }
      await tx.term.update({ where: { id: termId }, data: { roomMode } })
    })
  }

  /** Publishes the room assignment of the term or takes it back; publishing again keeps the first time. */
  async setPublished(
    { eventId, termId, organizationId }: TermScope,
    published: boolean,
  ): Promise<void> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, eventId, organizationId },
    })
    if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    if ((term.roomsPublishedAt !== null) === published) return
    await this.prisma.term.update({
      where: { id: termId },
      data: { roomsPublishedAt: published ? new Date() : null },
    })
  }

  async save(scope: TermScope, input: RoomInput, id?: string): Promise<void> {
    const { termId, organizationId } = scope
    await this.write(scope, async (tx, mode) => {
      // An individual room has no gender and exists only in a gendered term (US-145).
      const individual = input.individual === true
      const valid = individual
        ? mode === "GENDERED" && input.gender === null
        : (mode === "GENDERED") === (input.gender !== null)
      if (!valid) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
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
      const data = { ...input, individual }
      if (id) await tx.room.update({ where: { id }, data })
      else await tx.room.create({ data: { ...data, termId, organizationId } })
    })
  }

  /**
   * Creates the rooms of one bulk request in one transaction. A room whose name the term already
   * has is skipped, the rest is created; the result lists both.
   */
  async createMany(scope: TermScope, plan: BulkRoomsPlan): Promise<BulkRoomsResult> {
    const { termId, organizationId } = scope
    return this.write(scope, async (tx, mode) => {
      const inputs = planBulkRooms(plan, mode)
      if (!inputs) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      const taken = new Set(
        (await tx.room.findMany({ where: { termId, organizationId } })).map((room) =>
          room.name.toLowerCase(),
        ),
      )
      const free = inputs.filter((input) => !taken.has(input.name.toLowerCase()))
      await tx.room.createMany({
        data: free.map((input) => ({ ...input, termId, organizationId })),
      })
      return {
        created: free.map((input) => input.name),
        skipped: inputs.filter((input) => taken.has(input.name.toLowerCase())).map((i) => i.name),
      }
    })
  }

  /** Sets the number of extra beds of a room; under the event lock like every room write. Never blocked by occupancy. */
  async setExtraBeds(scope: TermScope, id: string, extraBeds: number): Promise<void> {
    const { termId, organizationId } = scope
    await this.write(scope, async (tx) => {
      const result = await tx.room.updateMany({
        where: { id, termId, organizationId },
        data: { extraBeds },
      })
      if (!result.count) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    })
  }

  async remove(scope: TermScope, id: string): Promise<void> {
    const { termId, organizationId } = scope
    await this.write(scope, async (tx) => {
      const result = await tx.room.deleteMany({ where: { id, termId, organizationId } })
      if (!result.count) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    })
  }

  /**
   * One-off copy of name, capacity and gender (not the extra beds, they belong to the term) from another term of the same event; the copies are
   * independent rows. Terms with different room modes cannot be copied: a gendered room needs a gender.
   */
  async copy(scope: TermScope, sourceTermId: string, strategy: RoomCopyStrategy): Promise<void> {
    const { eventId, termId, organizationId } = scope
    await this.write(scope, async (tx, mode) => {
      const source = await tx.term.findFirst({
        where: { id: sourceTermId, eventId, organizationId },
        include: { rooms: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
      })
      if (!source) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      if (source.id === termId || source.roomMode !== mode || !source.rooms.length) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }
      if (strategy === "REPLACE") await tx.room.deleteMany({ where: { termId, organizationId } })
      else {
        const taken = new Set(
          (await tx.room.findMany({ where: { termId, organizationId } })).map((room) =>
            room.name.toLowerCase(),
          ),
        )
        const colliding = source.rooms.filter((room) => taken.has(room.name.toLowerCase()))
        if (colliding.length) {
          throw new AppException(
            HttpStatus.CONFLICT,
            "ROOM_COPY_NAMES_TAKEN",
            "Rooms with these names already exist in the term",
            { names: colliding.map((room) => room.name).join(", ") },
          )
        }
      }
      await tx.room.createMany({
        data: source.rooms.map(({ name, capacity, gender, individual }) => ({
          name,
          capacity,
          gender,
          individual,
          termId,
          organizationId,
        })),
      })
    })
  }
}
