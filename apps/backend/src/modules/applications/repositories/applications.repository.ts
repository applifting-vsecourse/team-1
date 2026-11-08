import { Locale } from "@/core/email/locale"
import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import {
  NewApplication,
  SavedApplication,
  SubmissionEvent,
} from "@/modules/applications/domain/application-submission"
import { findDuplicate } from "@/modules/applications/domain/duplicate-application"
import { EvaluatedTerm } from "@/modules/applications/domain/evaluation"
import { OccupancySnapshot } from "@/modules/applications/domain/submission"
import { termLabel } from "@/modules/applications/domain/term-label"
import { AppException } from "@/shared/errors/app.exception"
import { isoDate } from "@/shared/utils/iso-date"
import { HttpStatus, Injectable } from "@nestjs/common"

/** What the duplicate check needs of a participant. */
type SubmittedPerson = {
  firstName: string
  lastName: string
  birthDate: string
  termIds: string[]
}

/** Decides the status of every term of every application from what the lock protects. */
export type Evaluate = (snapshot: OccupancySnapshot) => EvaluatedTerm[][]

/** Account creation can be deferred until validation under the event lock succeeds. */
export type ApplicationToSave = Omit<NewApplication, "userId"> & {
  userId: string | (() => Promise<string>)
}

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEventForSubmission(publicToken: string): Promise<SubmissionEvent | null> {
    return this.findEvent({ publicToken })
  }

  async findEventForOrganizer(
    eventId: string,
    organizationId: string,
  ): Promise<SubmissionEvent | null> {
    return this.findEvent({ id: eventId, organizationId })
  }

  private async findEvent(where: Prisma.EventWhereUniqueInput): Promise<SubmissionEvent | null> {
    const event = await this.prisma.event.findUnique({
      where,
      include: {
        organization: { select: { bankAccount: true } },
        terms: {
          where: { cancelledAt: null },
          orderBy: [{ startsOn: "asc" }, { endsOn: "asc" }, { id: "asc" }],
          include: { _count: { select: { rooms: true } } },
        },
      },
    })
    if (!event) return null
    return {
      id: event.id,
      organizationId: event.organizationId,
      name: event.name,
      bankAccount: event.organization.bankAccount,
      evaluationMode: event.evaluationMode,
      termsWithoutRooms: event.terms.filter((term) => term._count.rooms === 0).length,
      terms: event.terms.map(({ id, name, startsOn, endsOn, number, priceCzk }) => ({
        id,
        name,
        startsOn: isoDate(startsOn),
        endsOn: isoDate(endsOn),
        number,
        priceCzk,
      })),
    }
  }

  /**
   * Stores the applications and their term statuses in one transaction
   * (docs/PROJEKT.md, "Souběh (US-27)"): lock the selected terms (ordered by
   * id, so two submissions cannot deadlock), read the occupancy, let `evaluate`
   * decide, write. A concurrent submission to the same term waits at the lock
   * and then sees these confirmations, so capacity is never exceeded. The event
   * lock is acquired first and is also used by room writes (US-99).
   *
   * Receive time is taken after the lock is won, so `submittedAt` follows the
   * order of evaluation.
   */
  async saveEvaluated(
    event: Pick<SubmissionEvent, "id" | "organizationId">,
    applications: ApplicationToSave[],
    evaluate: Evaluate,
    organizerId?: string,
  ): Promise<SavedApplication[]> {
    const termIds = [...new Set(applications.flatMap((application) => application.termIds))]

    return this.prisma.$transaction(async (tx) => {
      // Room mutations use this same lock (US-99).
      await tx.$queryRaw`SELECT id FROM event WHERE id = ${event.id} FOR UPDATE`
      // The terms were read before the lock; one cancelled meanwhile must not take a confirmation.
      const activeTerms = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM term
        WHERE id IN (${Prisma.join(termIds)}) AND "eventId" = ${event.id} AND "cancelledAt" IS NULL
        ORDER BY id FOR UPDATE`
      if (activeTerms.length !== termIds.length) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }

      // The event lock above serialises submissions, so two concurrent
      // requests of the same participant cannot both pass this check.
      await this.assertNotRegistered(tx, event.id, applications, applications[0].locale)

      const [rooms, confirmed] = await Promise.all([
        tx.room.findMany({
          where: { termId: { in: termIds } },
          select: { termId: true, capacity: true, gender: true },
        }),
        tx.applicationTerm.findMany({
          where: { termId: { in: termIds }, status: "CONFIRMED" },
          select: { termId: true, application: { select: { gender: true } } },
        }),
      ])
      const confirmedGenders: OccupancySnapshot["confirmedGenders"] = {}
      for (const { termId, application } of confirmed) {
        confirmedGenders[termId] = [...(confirmedGenders[termId] ?? []), application.gender]
      }

      const roomsByTerm: OccupancySnapshot["roomsByTerm"] = {}
      for (const { termId, capacity, gender } of rooms) {
        roomsByTerm[termId] = [...(roomsByTerm[termId] ?? []), { capacity, gender }]
      }

      const evaluated = evaluate({ roomsByTerm, confirmedGenders })

      const saved: SavedApplication[] = []
      for (const [index, application] of applications.entries()) {
        const terms = evaluated[index]
        const userId =
          typeof application.userId === "function" ? await application.userId() : application.userId
        const submittedAt = new Date()
        const row = await tx.application.create({
          data: {
            organization: { connect: { id: event.organizationId } },
            event: { connect: { id: event.id } },
            user: { connect: { id: userId } },
            accessToken: application.accessToken,
            firstName: application.firstName,
            lastName: application.lastName,
            birthDate: new Date(`${application.birthDate}T00:00:00Z`),
            gender: application.gender,
            email: application.email,
            phone: application.phone,
            locale: application.locale,
            consentAt: application.consentAt,
            submittedAt,
            terms: {
              create: terms.map((term) => ({
                organization: { connect: { id: event.organizationId } },
                term: { connect: { id: term.termId } },
                status: term.status,
                priceCzk: term.priceCzk,
                evaluatedAt: submittedAt,
                ...(organizerId
                  ? {
                      statusChanges: {
                        create: {
                          organization: { connect: { id: event.organizationId } },
                          fromStatus: term.status,
                          toStatus: term.status,
                          changedBy: { connect: { id: organizerId } },
                        },
                      },
                    }
                  : {}),
              })),
            },
          },
          select: { id: true, number: true },
        })
        saved.push({
          number: row.number,
          id: row.id,
          accessToken: application.accessToken,
          firstName: application.firstName,
          terms,
        })
      }
      return saved
    })
  }

  /**
   * Cheap check before the participant account is created (US-23), so a
   * rejected duplicate leaves no account behind. Not race-proof on its own:
   * `saveEvaluated` repeats it under the event lock.
   */
  async assertNoDuplicate(
    eventId: string,
    participants: SubmittedPerson[],
    locale: Locale,
  ): Promise<void> {
    await this.assertNotRegistered(this.prisma, eventId, participants, locale)
  }

  /** Throws 409 `APPLICATION_DUPLICATE` for a participant already on one of their terms. */
  private async assertNotRegistered(
    db: Prisma.TransactionClient,
    eventId: string,
    participants: SubmittedPerson[],
    locale: Locale,
  ): Promise<void> {
    const registered = await db.applicationTerm.findMany({
      where: {
        termId: { in: [...new Set(participants.flatMap(({ termIds }) => termIds))] },
        // A cancelled term does not block a new application of the same participant (US-28).
        status: { not: "CANCELLED" },
        application: {
          eventId,
          birthDate: {
            in: participants.map(({ birthDate }) => new Date(`${birthDate}T00:00:00Z`)),
          },
        },
      },
      select: {
        termId: true,
        application: { select: { firstName: true, lastName: true, birthDate: true } },
      },
    })
    const duplicate = findDuplicate(
      registered.map(({ termId, application }) => ({
        termId,
        firstName: application.firstName,
        lastName: application.lastName,
        birthDate: application.birthDate.toISOString().slice(0, 10),
      })),
      participants,
    )
    if (!duplicate) return

    const term = await db.term.findUniqueOrThrow({
      where: { id: duplicate.termId },
      select: { name: true, startsOn: true, endsOn: true },
    })
    throw new AppException(
      HttpStatus.CONFLICT,
      "APPLICATION_DUPLICATE",
      "Participant is already registered for this term",
      {
        participant: `${duplicate.participant.firstName} ${duplicate.participant.lastName}`,
        term: termLabel(term, locale),
      },
    )
  }

  /** Moves the contact e-mail of the account's applications to `email`; those already there stay as they are. */
  async updateContactEmail(userId: string, email: string): Promise<void> {
    await this.prisma.application.updateMany({
      where: { userId, email: { not: email } },
      data: { email },
    })
  }
}
