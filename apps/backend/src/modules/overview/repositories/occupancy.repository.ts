import { PrismaService } from "@/core/prisma/prisma.service"
import { EventOccupancySource } from "@/modules/overview/domain/occupancy"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

@Injectable()
export class OccupancyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Active terms of the event with the genders of their confirmed and waitlisted applicants. */
  async findSource(eventId: string, organizationId: string): Promise<EventOccupancySource> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizationId },
      include: {
        rooms: { select: { capacity: true, gender: true } },
        terms: {
          where: { cancelledAt: null },
          orderBy: [{ startsOn: "asc" }, { endsOn: "asc" }, { name: "asc" }],
          include: {
            applicationTerms: {
              select: { status: true, application: { select: { gender: true } } },
            },
          },
        },
      },
    })
    if (!event) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return {
      eventId: event.id,
      roomMode: event.roomMode,
      rooms: event.rooms,
      terms: event.terms.map((term) => ({
        id: term.id,
        name: term.name,
        startsOn: isoDate(term.startsOn),
        endsOn: isoDate(term.endsOn),
        confirmed: term.applicationTerms
          .filter(({ status }) => status === "CONFIRMED")
          .map(({ application }) => application.gender),
        waitlisted: term.applicationTerms
          .filter(({ status }) => status === "WAITLISTED")
          .map(({ application }) => application.gender),
      })),
    }
  }
}
