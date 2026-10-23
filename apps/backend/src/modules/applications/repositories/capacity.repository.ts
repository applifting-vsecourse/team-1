import { PrismaService } from "@/core/prisma/prisma.service"
import {
  CapacityDetailsSnapshot,
  CapacitySnapshot,
} from "@/modules/applications/domain/event-capacity"
import { Injectable } from "@nestjs/common"

@Injectable()
export class CapacityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSnapshot(eventId: string, organizationId: string): Promise<CapacitySnapshot> {
    return this.findDetails(eventId, organizationId)
  }

  async findDetails(eventId: string, organizationId: string): Promise<CapacityDetailsSnapshot> {
    // Keep rooms and confirmations consistent even if Prisma loads relations separately.
    const [event] = await this.prisma.$transaction(
      [
        this.prisma.event.findFirstOrThrow({
          where: { id: eventId, organizationId },
          select: {
            name: true,
            roomMode: true,
            rooms: {
              orderBy: { id: "asc" },
              select: { id: true, name: true, capacity: true, gender: true },
            },
            terms: {
              orderBy: [{ startsOn: "asc" }, { id: "asc" }],
              select: {
                id: true,
                name: true,
                startsOn: true,
                endsOn: true,
                applicationTerms: {
                  where: { status: "CONFIRMED", organizationId },
                  select: { application: { select: { gender: true } } },
                },
              },
            },
          },
        }),
      ],
      { isolationLevel: "RepeatableRead" },
    )
    return {
      eventName: event.name,
      roomMode: event.roomMode,
      rooms: event.rooms,
      terms: event.terms.map((term) => ({
        id: term.id,
        name: term.name,
        startsOn: term.startsOn,
        endsOn: term.endsOn,
        confirmed: term.applicationTerms.map(({ application }) => ({ gender: application.gender })),
      })),
    }
  }
}
