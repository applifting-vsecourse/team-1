import { PrismaService } from "@/core/prisma/prisma.service"
import { ApplicationScope, OrganizerEditor } from "@/modules/applications/domain/application-scope"
import { isEditWindowOpen, isTermEditable } from "@/modules/applications/domain/edit-window"
import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import { logOrganizerEdit } from "@/modules/applications/repositories/application-edit-log"
import {
  ApplicationTransport,
  EventTransport,
  fullName,
  TermInfo,
  TransportInput,
  TransportKind,
  TransportOption,
  TransportParticipants,
} from "@/modules/transport/domain/transport"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

type Scope = { eventId: string; organizationId: string }

/** The history says "own transport" with this token, the screen translates it. */
export const OWN_TRANSPORT = "@own"

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
function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code
}

const activeTerm = { cancelledAt: null }
const taking = { status: { not: "CANCELLED" as const }, term: activeTerm }

// Rides by departure, own transport last.
const transportOrder = [
  { kind: "asc" as const },
  { departureAt: "asc" as const },
  { id: "asc" as const },
]

const option = (transport: {
  id: string
  kind: TransportKind
  name: string
  departurePlace: string | null
  departureAt: Date | null
  instructions: string | null
}): TransportOption => ({
  id: transport.id,
  kind: transport.kind,
  name: transport.name,
  departurePlace: transport.departurePlace,
  departureAt: transport.departureAt,
  instructions: transport.instructions,
})

/** The only place of transport (US-65) that touches the database. */
@Injectable()
export class TransportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list({ eventId, organizationId }: Scope): Promise<EventTransport> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizationId },
      select: { name: true },
    })
    if (!event) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const [terms, chosen] = await Promise.all([
      this.prisma.term.findMany({
        where: { eventId, organizationId, cancelledAt: null },
        orderBy: [{ startsOn: "asc" }, { number: "asc" }],
        include: { transports: { orderBy: transportOrder } },
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
    ])
    const chosenBy = new Map(chosen.map((row) => [row.transportId, row._count._all]))
    return {
      eventName: event.name,
      terms: terms.map((term) => ({
        ...termInfo(term),
        transports: term.transports.map((transport) => ({
          ...option(transport),
          participantsCount: chosenBy.get(transport.id) ?? 0,
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
  ): Promise<{
    termId: string
    kind: TransportKind
    endsOn: string
    isCancelled: boolean
  } | null> {
    const transport = await this.prisma.transport.findFirst({
      where: { id, organizationId, term: { eventId } },
      include: { term: true },
    })
    return transport
      ? {
          termId: transport.termId,
          kind: transport.kind,
          endsOn: isoDay(transport.term.endsOn),
          isCancelled: transport.term.cancelledAt !== null,
        }
      : null
  }

  async create(
    { organizationId }: Scope,
    termId: string,
    kind: TransportKind,
    input: TransportInput,
  ): Promise<void> {
    try {
      await this.prisma.transport.create({ data: { ...input, kind, termId, organizationId } })
    } catch (error) {
      // Two organizers adding own transport at once: the partial unique index lets one through.
      if (isPrismaError(error, "P2002")) {
        throw new AppException(HttpStatus.CONFLICT, "TRANSPORT_OWN_EXISTS")
      }
      throw error
    }
  }

  async hasOwn({ organizationId }: Scope, termId: string): Promise<boolean> {
    return (
      (await this.prisma.transport.count({ where: { termId, organizationId, kind: "OWN" } })) > 0
    )
  }

  async update({ organizationId }: Scope, id: string, input: TransportInput): Promise<void> {
    await this.prisma.transport.updateMany({ where: { id, organizationId }, data: input })
  }

  /**
   * Participants who chose it fall back to "not chosen yet" (`onDelete: SetNull`). Without
   * `isConfirmed` it is deleted only while nobody has chosen it — checked in the same statement,
   * so a choice made a moment ago is never dropped silently.
   * @returns false when somebody chose it and the deletion was not confirmed.
   */
  async remove({ organizationId }: Scope, id: string, isConfirmed: boolean): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Lock the row first: a choice saved at the same moment holds a share lock on it (foreign
      // key), so the count below sees it or the choice fails — it is never dropped unseen.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "transport"
        WHERE "id" = ${id} AND "organizationId" = ${organizationId} FOR UPDATE`
      if (locked.length === 0) return false
      if (
        !isConfirmed &&
        (await tx.applicationTerm.count({ where: { transportId: id, ...taking } })) > 0
      ) {
        return false
      }
      const { count } = await tx.transport.deleteMany({ where: { id, organizationId } })
      return count > 0
    })
  }

  /** `transportId` null lists the participants of `termId` who travel on their own. */
  async participants(
    { eventId, organizationId }: Scope,
    transportId: string,
  ): Promise<TransportParticipants> {
    const transport = await this.prisma.transport.findFirst({
      where: { id: transportId, organizationId, term: { eventId } },
      include: { term: true },
    })
    if (!transport) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const rows = await this.prisma.applicationTerm.findMany({
      where: { termId: transport.termId, organizationId, ...taking, transportId: transport.id },
      orderBy: [{ application: { lastName: "asc" } }, { application: { firstName: "asc" } }],
      select: {
        application: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    })
    return {
      ...termInfo(transport.term),
      name: transport.name,
      kind: transport.kind,
      participants: rows.map(({ application }) => ({
        applicationId: application.id,
        name: fullName(application.firstName, application.lastName),
        email: application.email,
        phone: application.phone,
      })),
    }
  }

  /** `null` when the application is outside `scope` (the participant's own or the organization's). */
  async ofApplication(
    scope: ApplicationScope,
    applicationId: string,
  ): Promise<ApplicationTransport | null> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, ...scope },
      include: {
        event: { select: { name: true } },
        terms: {
          where: taking,
          orderBy: { term: { startsOn: "asc" } },
          include: {
            term: { include: { transports: { orderBy: transportOrder } } },
          },
        },
      },
    })
    if (!application) return null
    const today = todayInPrague(new Date())
    return {
      participantName: fullName(application.firstName, application.lastName),
      eventName: application.event.name,
      terms: application.terms.map(({ term, status, transportId }) => ({
        ...termInfo(term),
        status,
        selectedTransportId: transportId,
        isEditable: isTermEditable({ status, endsOn: term.endsOn }, today),
        options: term.transports.map(option),
      })),
    }
  }

  /**
   * The choice of one term, with the rules of both roles (D-191): the term is active for the
   * application, still within the edit window (D-192) and the transport is on offer in the term.
   * An organizer's choice is written to the history of the application.
   */
  async choose(
    scope: ApplicationScope,
    applicationId: string,
    termId: string,
    transportId: string,
    editor?: OrganizerEditor,
  ): Promise<"OK" | "NOT_FOUND" | "CLOSED"> {
    const row = await this.prisma.applicationTerm.findFirst({
      where: { applicationId, termId, application: scope, ...taking },
      select: {
        id: true,
        organizationId: true,
        transport: { select: { kind: true, name: true } },
        term: { select: { endsOn: true } },
      },
    })
    if (!row) return "NOT_FOUND"
    const chosen = await this.prisma.transport.findFirst({ where: { id: transportId, termId } })
    if (!chosen) return "NOT_FOUND"
    if (!isEditWindowOpen(row.term.endsOn, todayInPrague(new Date()))) return "CLOSED"
    const label = (transport: { kind: TransportKind; name: string } | null) =>
      transport === null ? null : transport.kind === "OWN" ? OWN_TRANSPORT : transport.name
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.applicationTerm.update({ where: { id: row.id }, data: { transportId } })
        if (editor) {
          await logOrganizerEdit(tx, {
            organizationId: row.organizationId,
            applicationId,
            editor,
            field: "transport",
            termId,
            from: label(row.transport),
            to: label(chosen),
          })
        }
      })
    } catch (error) {
      // The organizer deleted the transport between the check and the save.
      if (isPrismaError(error, "P2003")) {
        throw new AppException(HttpStatus.CONFLICT, "TRANSPORT_UNAVAILABLE")
      }
      throw error
    }
    return "OK"
  }
}
