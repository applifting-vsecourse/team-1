import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeTotalBeds } from "@/modules/applications/domain/capacity"
import { EventTerm, TermInput } from "@/modules/events/domain/event-term"
import { Injectable } from "@nestjs/common"

const include = {
  applicationTerms: { select: { status: true } },
} as const

type TermRow = Prisma.TermGetPayload<{ include: typeof include }>

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

function toTerm(row: TermRow, capacity: number): EventTerm {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    startsOn: isoDate(row.startsOn),
    endsOn: isoDate(row.endsOn),
    priceCzk: row.priceCzk,
    capacity,
    confirmedCount: row.applicationTerms.filter(({ status }) => status === "CONFIRMED").length,
    waitlistedCount: row.applicationTerms.filter(({ status }) => status === "WAITLISTED").length,
    cancelledAt: row.cancelledAt,
    cancelReason: row.cancelReason,
  }
}

@Injectable()
export class TermsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEvent(eventId: string): Promise<EventTerm[]> {
    const [rows, capacity] = await Promise.all([
      this.prisma.term.findMany({ where: { eventId }, include }),
      this.bedCount(eventId),
    ])
    return rows.map((row) => toTerm(row, capacity))
  }

  async findById(termId: string): Promise<EventTerm | null> {
    const row = await this.prisma.term.findUnique({ where: { id: termId }, include })
    return row ? toTerm(row, await this.bedCount(row.eventId)) : null
  }

  async create(organizationId: string, eventId: string, input: TermInput): Promise<EventTerm> {
    const row = await this.prisma.term.create({
      data: { organizationId, eventId, ...this.toData(input) },
      include,
    })
    return toTerm(row, await this.bedCount(eventId))
  }

  async update(termId: string, input: TermInput): Promise<EventTerm> {
    const row = await this.prisma.term.update({
      where: { id: termId },
      data: this.toData(input),
      include,
    })
    return toTerm(row, await this.bedCount(row.eventId))
  }

  async cancel(termId: string, reason: string): Promise<EventTerm> {
    const row = await this.prisma.term.update({
      where: { id: termId },
      data: { cancelledAt: new Date(), cancelReason: reason },
      include,
    })
    return toTerm(row, await this.bedCount(row.eventId))
  }

  private toData(input: TermInput) {
    return {
      name: input.name,
      startsOn: new Date(input.startsOn),
      endsOn: new Date(input.endsOn),
      priceCzk: input.priceCzk,
    }
  }

  /** Beds of the event's rooms, women's + men's, from the one capacity calculation (US-26). */
  private async bedCount(eventId: string): Promise<number> {
    const rooms = await this.prisma.room.findMany({
      where: { eventId },
      select: { capacity: true, gender: true },
    })
    return computeTotalBeds(rooms)
  }
}
