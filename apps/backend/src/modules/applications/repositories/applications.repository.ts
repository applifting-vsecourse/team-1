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
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

/** Decides the status of every term of every application from what the lock protects. */
export type Evaluate = (snapshot: OccupancySnapshot) => EvaluatedTerm[][]

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEventForSubmission(publicToken: string): Promise<SubmissionEvent | null> {
    const event = await this.prisma.event.findUnique({
      where: { publicToken },
      include: {
        organization: { select: { bankAccount: true } },
        terms: { where: { cancelledAt: null }, orderBy: [{ startsOn: "asc" }, { name: "asc" }] },
        _count: { select: { rooms: true } },
      },
    })
    if (!event) return null
    return {
      id: event.id,
      organizationId: event.organizationId,
      name: event.name,
      bankAccount: event.organization.bankAccount,
      roomCount: event._count.rooms,
      terms: event.terms.map(({ id, name, priceCzk }) => ({ id, name, priceCzk })),
    }
  }

  /**
   * Stores the applications and their term statuses in one transaction
   * (docs/PROJEKT.md, "Souběh (US-27)"): lock the selected terms (ordered by
   * id, so two submissions cannot deadlock), read the occupancy, let `evaluate`
   * decide, write. A concurrent submission to the same term waits at the lock
   * and then sees these confirmations, so capacity is never exceeded. The event
   * lock is acquired first and is also used by room writes (US-14).
   *
   * Receive time is taken after the lock is won, so `submittedAt` follows the
   * order of evaluation.
   */
  async saveEvaluated(
    event: Pick<SubmissionEvent, "id" | "organizationId">,
    applications: NewApplication[],
    evaluate: Evaluate,
  ): Promise<SavedApplication[]> {
    const termIds = [...new Set(applications.flatMap((application) => application.termIds))]

    return this.prisma.$transaction(async (tx) => {
      // Room mutations use this same lock (US-14).
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
      const registered = await tx.applicationTerm.findMany({
        where: {
          termId: { in: termIds },
          application: {
            eventId: event.id,
            birthDate: {
              in: applications.map(({ birthDate }) => new Date(`${birthDate}T00:00:00Z`)),
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
        applications,
      )
      if (duplicate) {
        const term = await tx.term.findUniqueOrThrow({
          where: { id: duplicate.termId },
          select: { name: true },
        })
        throw new AppException(
          HttpStatus.CONFLICT,
          "APPLICATION_DUPLICATE",
          "Participant is already registered for this term",
          {
            participant: `${duplicate.participant.firstName} ${duplicate.participant.lastName}`,
            term: term.name,
          },
        )
      }

      const [rooms, confirmed] = await Promise.all([
        tx.room.findMany({
          where: { eventId: event.id },
          select: { capacity: true, gender: true },
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

      const evaluated = evaluate({ rooms, confirmedGenders })

      const saved: SavedApplication[] = []
      for (const [index, application] of applications.entries()) {
        const terms = evaluated[index]
        const submittedAt = new Date()
        const row = await tx.application.create({
          data: {
            organization: { connect: { id: event.organizationId } },
            event: { connect: { id: event.id } },
            user: { connect: { id: application.userId } },
            accessToken: application.accessToken,
            firstName: application.firstName,
            lastName: application.lastName,
            birthDate: new Date(`${application.birthDate}T00:00:00Z`),
            gender: application.gender,
            email: application.email,
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
              })),
            },
          },
          select: { number: true },
        })
        saved.push({
          number: row.number,
          accessToken: application.accessToken,
          firstName: application.firstName,
          terms,
        })
      }
      return saved
    })
  }
}
