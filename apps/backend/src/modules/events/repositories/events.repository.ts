import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeTotalBeds } from "@/modules/applications/domain/capacity"
import { sortTerms } from "@/modules/events/domain/event-term"
import { NewEvent, StoredEvent } from "@/modules/events/domain/organizer-event"
import { Injectable } from "@nestjs/common"

const include = {
  organization: { select: { name: true } },
  terms: {
    where: { cancelledAt: null },
    select: {
      id: true,
      name: true,
      startsOn: true,
      endsOn: true,
      _count: { select: { applicationTerms: { where: { status: "CONFIRMED" } } } },
    },
  },
  rooms: { select: { capacity: true, gender: true } },
} as const

type EventRow = Prisma.EventGetPayload<{ include: typeof include }>

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

function toStored(row: EventRow): StoredEvent {
  const starts = row.terms.map((term) => isoDate(term.startsOn)).sort()
  const ends = row.terms.map((term) => isoDate(term.endsOn)).sort()
  const capacity = computeTotalBeds(row.rooms)
  const terms = row.terms.map((term) => ({
    id: term.id,
    name: term.name,
    startsOn: isoDate(term.startsOn),
    endsOn: isoDate(term.endsOn),
    capacity,
    confirmedCount: term._count.applicationTerms,
  }))
  return {
    id: row.id,
    organizationId: row.organizationId,
    organizationName: row.organization.name,
    name: row.name,
    description: row.description,
    location: row.location,
    publicToken: row.publicToken,
    createdAt: row.createdAt,
    termCount: row.terms.length,
    roomCount: row.rooms.length,
    startsOn: starts[0] ?? null,
    endsOn: ends[ends.length - 1] ?? null,
    terms: sortTerms(terms),
  }
}

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<StoredEvent | null> {
    const row = await this.prisma.event.findUnique({ where: { id }, include })
    return row ? toStored(row) : null
  }

  async findByOrganizations(organizationIds: string[]): Promise<StoredEvent[]> {
    const rows = await this.prisma.event.findMany({
      where: { organizationId: { in: organizationIds } },
      include,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    })
    return rows.map(toStored)
  }

  async create(event: NewEvent): Promise<StoredEvent> {
    const row = await this.prisma.event.create({ data: event, include })
    return toStored(row)
  }
}
