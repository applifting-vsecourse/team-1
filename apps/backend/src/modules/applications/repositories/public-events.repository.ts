import { PrismaService } from "@/core/prisma/prisma.service"
import { PublicEvent } from "@/modules/applications/domain/public-event"
import { Injectable } from "@nestjs/common"

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

@Injectable()
export class PublicEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPublicToken(
    publicToken: string,
  ): Promise<{ event: PublicEvent; roomCount: number } | null> {
    const event = await this.prisma.event.findUnique({
      where: { publicToken },
      include: {
        terms: { orderBy: [{ startsOn: "asc" }, { name: "asc" }] },
        _count: { select: { rooms: true } },
      },
    })
    if (!event) return null

    return {
      roomCount: event._count.rooms,
      event: {
        name: event.name,
        description: event.description,
        location: event.location,
        terms: event.terms.map((term) => ({
          id: term.id,
          name: term.name,
          startsOn: isoDate(term.startsOn),
          endsOn: isoDate(term.endsOn),
          priceCzk: term.priceCzk,
        })),
      },
    }
  }
}
