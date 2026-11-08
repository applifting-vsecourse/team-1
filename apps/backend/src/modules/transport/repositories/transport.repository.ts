import { PrismaService } from "@/core/prisma/prisma.service"
import {
  ApplicationTransport,
  EventTransport,
  fullName,
  TermInfo,
  TransportInput,
  TransportParticipants,
} from "@/modules/transport/domain/transport"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

type Scope = { eventId: string; organizationId: string }

const isoDay = (date: Date): string => date.toISOString().slice(0, 10)
const termInfo = (term: {
  id: string
  name: string | null
  startsOn: Date
  endsOn: Date
}): TermInfo => ({
  termId: term.id,
  termName: term.name,
  startsOn: isoDay(term.startsOn),
  endsOn: isoDay(term.endsOn),
})

// A participant takes part in a term unless the application in it or the term itself is cancelled
// (cancelling a term leaves the status of the applications in it).
const activeTerm = { cancelledAt: null }
const taking = { status: { not: "CANCELLED" as const }, term: activeTerm }

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
    const [terms, chosen, own] = await Promise.all([
      this.prisma.term.findMany({
        where: { eventId, organizationId, cancelledAt: null },
        orderBy: [{ startsOn: "asc" }, { number: "asc" }],
        include: { transports: { orderBy: [{ departureAt: "asc" }, { id: "asc" }] } },
      }),
      this.prisma.applicationTerm.groupBy({
        by: ["transportId"],
        where: {
          organizationId,
          transportId: { not: null },
          ...taking,
          term: { eventId, ...activeTerm },
        },
        _count: { _all: true },
      }),
      this.prisma.applicationTerm.groupBy({
        by: ["termId"],
        where: { organizationId, ownTransport: true, ...taking, term: { eventId, ...activeTerm } },
        _count: { _all: true },
      }),
    ])
    const chosenBy = new Map(chosen.map((row) => [row.transportId, row._count._all]))
    const ownIn = new Map(own.map((row) => [row.termId, row._count._all]))
    return {
      eventName: event.name,
      eventLocation: event.location,
      terms: terms.map((term) => ({
        ...termInfo(term),
        ownCount: ownIn.get(term.id) ?? 0,
        transports: term.transports.map(({ id, name, departurePlace, departureAt }) => ({
          id,
          name,
          departurePlace,
          departureAt,
          participantsCount: chosenBy.get(id) ?? 0,
        })),
      })),
    }
  }

  /** The term of the event for validating a new transport; `null` when it is not the event's. */
  async findTerm(
    { eventId, organizationId }: Scope,
    termId: string,
  ): Promise<{ endsOn: string; isCancelled: boolean } | null> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, eventId, organizationId },
    })
    return term ? { endsOn: isoDay(term.endsOn), isCancelled: term.cancelledAt !== null } : null
  }

  /** The term a transport belongs to; `null` when it is not the event's. */
  async termOfTransport(
    { eventId, organizationId }: Scope,
    id: string,
  ): Promise<{ termId: string; endsOn: string; isCancelled: boolean } | null> {
    const transport = await this.prisma.transport.findFirst({
      where: { id, organizationId, term: { eventId } },
      include: { term: true },
    })
    return transport
      ? {
          termId: transport.termId,
          endsOn: isoDay(transport.term.endsOn),
          isCancelled: transport.term.cancelledAt !== null,
        }
      : null
  }

  async create({ organizationId }: Scope, termId: string, input: TransportInput): Promise<void> {
    await this.prisma.transport.create({ data: { ...input, termId, organizationId } })
  }

  async update({ organizationId }: Scope, id: string, input: TransportInput): Promise<void> {
    await this.prisma.transport.updateMany({ where: { id, organizationId }, data: input })
  }

  /** `transportId` null lists the participants of `termId` who travel on their own. */
  async participants(
    { eventId, organizationId }: Scope,
    transportId: string | null,
    termId: string,
  ): Promise<TransportParticipants> {
    const transport = transportId
      ? await this.prisma.transport.findFirst({
          where: { id: transportId, organizationId, term: { eventId } },
        })
      : null
    if (transportId && !transport) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const term = await this.prisma.term.findFirst({
      where: { id: transport?.termId ?? termId, eventId, organizationId },
    })
    if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const rows = await this.prisma.applicationTerm.findMany({
      where: {
        termId: term.id,
        organizationId,
        ...taking,
        ...(transport ? { transportId: transport.id } : { ownTransport: true }),
      },
      orderBy: [{ application: { lastName: "asc" } }, { application: { firstName: "asc" } }],
      select: {
        application: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    return {
      ...termInfo(term),
      name: transport?.name ?? null,
      participants: rows.map(({ application }) => ({
        applicationId: application.id,
        name: fullName(application.firstName, application.lastName),
        email: application.email,
      })),
    }
  }

  /** `null` when the application is not the participant's own (or does not exist). */
  async ofApplication(userId: string, applicationId: string): Promise<ApplicationTransport | null> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        event: { select: { name: true } },
        terms: {
          where: taking,
          orderBy: { term: { startsOn: "asc" } },
          include: {
            term: { include: { transports: { orderBy: [{ departureAt: "asc" }, { id: "asc" }] } } },
          },
        },
      },
    })
    if (!application) return null
    return {
      participantName: fullName(application.firstName, application.lastName),
      eventName: application.event.name,
      terms: application.terms.map(({ term, status, transportId, ownTransport }) => ({
        ...termInfo(term),
        status,
        selectedTransportId: transportId,
        isOwn: ownTransport,
        options: term.transports.map(({ id, name, departurePlace, departureAt }) => ({
          id,
          name,
          departurePlace,
          departureAt,
        })),
      })),
    }
  }

  /** @returns false when the term is not the participant's active one or the transport not its. */
  async choose(
    userId: string,
    applicationId: string,
    termId: string,
    transportId: string | null,
  ): Promise<boolean> {
    const row = await this.prisma.applicationTerm.findFirst({
      where: { applicationId, termId, application: { userId }, ...taking },
      select: { id: true },
    })
    if (!row) return false
    if (
      transportId &&
      !(await this.prisma.transport.findFirst({ where: { id: transportId, termId } }))
    ) {
      return false
    }
    await this.prisma.applicationTerm.update({
      where: { id: row.id },
      data: { transportId, ownTransport: transportId === null },
    })
    return true
  }
}
