import { PrismaService } from "@/core/prisma/prisma.service"
import { RoomCapacity } from "@/modules/applications/domain/capacity"
import { WaitlistCandidate } from "@/modules/applications/domain/waitlist"
import { Gender } from "@/shared/domain/gender"
import { Injectable } from "@nestjs/common"

export type SubstituteApplication = WaitlistCandidate & {
  firstName: string
  lastName: string
  birthDate: Date
  email: string
  priceCzk: number
}

export type SubstituteTermState = {
  organizationId: string
  eventId: string
  /** A cancelled term takes no one into its beds (US-13). */
  isCancelled: boolean
  /** First day of the term: from then on the waitlist is cancelled, not filled (D-064). */
  startsOn: Date
  evaluationMode: "AUTOMATIC" | "MANUAL"
  roomMode: "GENDERED" | "SHARED"
  rooms: RoomCapacity[]
  confirmedGenders: Gender[]
  /** Everyone waiting on the waitlist of the term. */
  waitlisted: SubstituteApplication[]
}

@Injectable()
export class SubstitutesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null when the term is not a term of the event. */
  findTermState(
    organizationId: string,
    eventId: string,
    termId: string,
  ): Promise<SubstituteTermState | null> {
    return this.readTermState({ id: termId, eventId, organizationId })
  }

  /** The same for the system, which knows the term only (US-31). Null when there is none. */
  findTermStateById(termId: string): Promise<SubstituteTermState | null> {
    return this.readTermState({ id: termId })
  }

  private async readTermState(where: {
    id: string
    eventId?: string
    organizationId?: string
  }): Promise<SubstituteTermState | null> {
    const term = await this.prisma.term.findFirst({
      where,
      select: {
        eventId: true,
        organizationId: true,
        cancelledAt: true,
        startsOn: true,
        roomMode: true,
        event: { select: { evaluationMode: true } },
      },
    })
    if (!term) return null
    const { organizationId, eventId } = term
    const termId = where.id
    const [rooms, confirmed, waiting] = await Promise.all([
      this.prisma.room.findMany({
        where: { termId },
        select: { capacity: true, extraBeds: true, gender: true },
      }),
      this.prisma.applicationTerm.findMany({
        where: { organizationId, termId, status: "CONFIRMED" },
        select: { application: { select: { gender: true } } },
      }),
      this.prisma.applicationTerm.findMany({
        where: { organizationId, termId, status: "WAITLISTED", application: { eventId } },
        select: {
          priceCzk: true,
          application: {
            select: {
              id: true,
              number: true,
              firstName: true,
              lastName: true,
              birthDate: true,
              gender: true,
              email: true,
              submittedAt: true,
            },
          },
        },
      }),
    ])
    return {
      organizationId,
      eventId,
      isCancelled: term.cancelledAt !== null,
      startsOn: term.startsOn,
      evaluationMode: term.event.evaluationMode,
      roomMode: term.roomMode,
      rooms,
      confirmedGenders: confirmed.map((row) => row.application.gender),
      waitlisted: waiting.map(({ application, priceCzk }) => ({
        applicationId: application.id,
        termId,
        roomMode: term.roomMode,
        gender: application.gender,
        status: "WAITLISTED" as const,
        submittedAt: application.submittedAt,
        number: application.number,
        firstName: application.firstName,
        lastName: application.lastName,
        birthDate: application.birthDate,
        email: application.email,
        priceCzk,
      })),
    }
  }
}
