import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeTotalBeds } from "@/modules/applications/domain/capacity"
import { MAX_TERM_NUMBER } from "@/modules/applications/domain/variable-symbol"
import { EventTerm, TermInput } from "@/modules/events/domain/event-term"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

const include = {
  applicationTerms: { select: { status: true } },
  rooms: { select: { capacity: true, extraBeds: true, gender: true } },
} as const

type TermRow = Prisma.TermGetPayload<{ include: typeof include }>

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

function toTerm(row: TermRow): EventTerm {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    startsOn: isoDate(row.startsOn),
    endsOn: isoDate(row.endsOn),
    priceCzk: row.priceCzk,
    roomMode: row.roomMode,
    roomCount: row.rooms.length,
    capacity: computeTotalBeds(row.rooms),
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
    const rows = await this.prisma.term.findMany({ where: { eventId }, include })
    return rows.map(toTerm)
  }

  async findById(termId: string): Promise<EventTerm | null> {
    const row = await this.prisma.term.findUnique({ where: { id: termId }, include })
    return row ? toTerm(row) : null
  }

  async create(organizationId: string, eventId: string, input: TermInput): Promise<EventTerm> {
    // The event row is locked so two concurrent creates cannot take the same number.
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${eventId} FOR UPDATE`
      const { _max } = await tx.term.aggregate({ where: { eventId }, _max: { number: true } })
      const number = (_max.number ?? 0) + 1
      if (number > MAX_TERM_NUMBER)
        throw new AppException(HttpStatus.CONFLICT, "TERM_LIMIT_REACHED")
      return tx.term.create({
        data: { organizationId, eventId, number, ...this.toData(input) },
        include,
      })
    })
    return toTerm(row)
  }

  async update(termId: string, input: TermInput): Promise<EventTerm> {
    const row = await this.prisma.term.update({
      where: { id: termId },
      data: this.toData(input),
      include,
    })
    return toTerm(row)
  }

  async cancel(termId: string, reason: string): Promise<EventTerm> {
    const row = await this.prisma.term.update({
      where: { id: termId },
      data: { cancelledAt: new Date(), cancelReason: reason },
      include,
    })
    return toTerm(row)
  }

  private toData(input: TermInput) {
    return {
      name: input.name,
      startsOn: new Date(input.startsOn),
      endsOn: new Date(input.endsOn),
      priceCzk: input.priceCzk,
    }
  }
}
