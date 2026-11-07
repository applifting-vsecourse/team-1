import { PrismaService } from "@/core/prisma/prisma.service"
import {
  ApplicationTransport,
  EventTransport,
  fullName,
  TransportInput,
  TransportParticipants,
} from "@/modules/transport/domain/transport"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

type Scope = { eventId: string; organizationId: string }

// An application takes part in the event while at least one of its terms is neither cancelled
// itself nor a cancelled term of the event (cancelling a term leaves the application's status).
const active = {
  terms: {
    some: { status: { not: "CANCELLED" as const }, term: { cancelledAt: null } },
  },
}

/** The only place of transport (US-65) that touches the database. */
@Injectable()
export class TransportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list({ eventId, organizationId }: Scope): Promise<EventTransport> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizationId },
      select: { name: true, location: true },
    })
    if (!event) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const [transports, counts, ownCount] = await Promise.all([
      this.prisma.transport.findMany({
        where: { eventId, organizationId },
        orderBy: [{ departureAt: "asc" }, { id: "asc" }],
      }),
      this.prisma.application.groupBy({
        by: ["transportId"],
        where: { eventId, organizationId, transportId: { not: null }, ...active },
        _count: { _all: true },
      }),
      this.prisma.application.count({
        where: { eventId, organizationId, transportId: null, ...active },
      }),
    ])
    const countOf = new Map(counts.map((row) => [row.transportId, row._count._all]))
    return {
      eventName: event.name,
      eventLocation: event.location,
      ownCount,
      transports: transports.map(({ id, name, departurePlace, departureAt }) => ({
        id,
        name,
        departurePlace,
        departureAt,
        participantsCount: countOf.get(id) ?? 0,
      })),
    }
  }

  async save(
    { eventId, organizationId }: Scope,
    input: TransportInput,
    id?: string,
  ): Promise<void> {
    if (!id) {
      const event = await this.prisma.event.findFirst({ where: { id: eventId, organizationId } })
      if (!event) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      await this.prisma.transport.create({ data: { ...input, eventId, organizationId } })
      return
    }
    const result = await this.prisma.transport.updateMany({
      where: { id, eventId, organizationId },
      data: input,
    })
    if (!result.count) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
  }

  /** `transportId` null lists those who travel on their own. */
  async participants(
    { eventId, organizationId }: Scope,
    transportId: string | null,
  ): Promise<TransportParticipants> {
    let name: string | null = null
    if (transportId) {
      const transport = await this.prisma.transport.findFirst({
        where: { id: transportId, eventId, organizationId },
      })
      if (!transport) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
      name = transport.name
    }
    const terms = await this.prisma.term.findMany({
      where: { eventId, organizationId, cancelledAt: null },
      orderBy: [{ startsOn: "asc" }, { number: "asc" }],
      include: {
        applicationTerms: {
          where: { status: { not: "CANCELLED" }, application: { transportId } },
          orderBy: { application: { lastName: "asc" } },
          select: {
            application: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    })
    return {
      name,
      groups: terms
        .filter((term) => term.applicationTerms.length > 0)
        .map((term) => ({
          termId: term.id,
          termName: term.name,
          startsOn: term.startsOn.toISOString().slice(0, 10),
          endsOn: term.endsOn.toISOString().slice(0, 10),
          participants: term.applicationTerms.map(({ application }) => ({
            applicationId: application.id,
            name: fullName(application.firstName, application.lastName),
            email: application.email,
          })),
        })),
    }
  }

  /** `null` when the application is not the participant's own (or does not exist). */
  async ofApplication(userId: string, applicationId: string): Promise<ApplicationTransport | null> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        event: {
          select: {
            name: true,
            transports: { orderBy: [{ departureAt: "asc" }, { id: "asc" }] },
          },
        },
      },
    })
    if (!application) return null
    return {
      participantName: fullName(application.firstName, application.lastName),
      eventName: application.event.name,
      selectedTransportId: application.transportId,
      options: application.event.transports.map(({ id, name, departurePlace, departureAt }) => ({
        id,
        name,
        departurePlace,
        departureAt,
      })),
    }
  }

  /** @returns false when the application is not the participant's or the transport not the event's. */
  async choose(
    userId: string,
    applicationId: string,
    transportId: string | null,
  ): Promise<boolean> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      select: { eventId: true },
    })
    if (!application) return false
    if (transportId) {
      const transport = await this.prisma.transport.findFirst({
        where: { id: transportId, eventId: application.eventId },
      })
      if (!transport) return false
    }
    await this.prisma.application.update({ where: { id: applicationId }, data: { transportId } })
    return true
  }
}
