import { PrismaService } from "@/core/prisma/prisma.service"
import {
  ApplicationProgram,
  EventProgram,
  planProgramCopy,
  ProgramBlock,
  ProgramCopyPlan,
  ProgramCopyStrategy,
  ProgramInput,
  TermInfo,
  TermProgram,
} from "@/modules/program/domain/program"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

type Scope = { eventId: string; organizationId: string }

const isoDay = (date: Date): string => date.toISOString().slice(0, 10)

// By day, then by time; the id keeps blocks of the same time in a stable order.
const blockOrder = [
  { date: "asc" as const },
  { startTime: "asc" as const },
  { endTime: "asc" as const },
  { id: "asc" as const },
]

const termProgram = (term: {
  id: string
  name: string | null
  startsOn: Date
  endsOn: Date
  programBlocks: {
    id: string
    date: Date
    startTime: string
    endTime: string
    name: string
    place: string | null
    description: string | null
  }[]
}): TermProgram => ({
  termId: term.id,
  termName: term.name,
  startsOn: isoDay(term.startsOn),
  endsOn: isoDay(term.endsOn),
  blocks: term.programBlocks.map((block): ProgramBlock => ({
    id: block.id,
    date: isoDay(block.date),
    startTime: block.startTime,
    endTime: block.endTime,
    name: block.name,
    place: block.place,
    description: block.description,
  })),
})

const toData = (input: ProgramInput) => ({
  date: new Date(`${input.date}T00:00:00.000Z`),
  startTime: input.startTime,
  endTime: input.endTime,
  name: input.name,
  place: input.place,
  description: input.description,
})

/** The only place of the program (US-66) that touches the database. */
@Injectable()
export class ProgramRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Cancelled terms are not offered any more, so they have no program to manage. */
  async list({ eventId, organizationId }: Scope): Promise<EventProgram> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizationId },
      select: { name: true },
    })
    if (!event) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const terms = await this.prisma.term.findMany({
      where: { eventId, organizationId, cancelledAt: null },
      orderBy: [{ startsOn: "asc" }, { number: "asc" }],
      include: { programBlocks: { orderBy: blockOrder } },
    })
    return { eventName: event.name, terms: terms.map(termProgram) }
  }

  /** The term of the event for validating a block; `null` when it is not the event's. */
  async findTerm(
    { eventId, organizationId }: Scope,
    termId: string,
  ): Promise<(TermInfo & { isCancelled: boolean }) | null> {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, eventId, organizationId },
    })
    return term
      ? {
          termId: term.id,
          termName: term.name,
          startsOn: isoDay(term.startsOn),
          endsOn: isoDay(term.endsOn),
          isCancelled: term.cancelledAt !== null,
        }
      : null
  }

  /** The term a block belongs to; `null` when the block is not the event's. */
  async termOfBlock(
    { eventId, organizationId }: Scope,
    id: string,
  ): Promise<(TermInfo & { isCancelled: boolean }) | null> {
    const block = await this.prisma.programBlock.findFirst({
      where: { id, organizationId, term: { eventId } },
      include: { term: true },
    })
    if (!block) return null
    return {
      termId: block.term.id,
      termName: block.term.name,
      startsOn: isoDay(block.term.startsOn),
      endsOn: isoDay(block.term.endsOn),
      isCancelled: block.term.cancelledAt !== null,
    }
  }

  async create({ organizationId }: Scope, termId: string, input: ProgramInput): Promise<void> {
    await this.prisma.programBlock.create({ data: { organizationId, termId, ...toData(input) } })
  }

  async update({ organizationId }: Scope, id: string, input: ProgramInput): Promise<void> {
    await this.prisma.programBlock.updateMany({
      where: { id, organizationId },
      data: toData(input),
    })
  }

  async remove({ organizationId }: Scope, id: string): Promise<void> {
    await this.prisma.programBlock.deleteMany({ where: { id, organizationId } })
  }

  /**
   * One-off copy of the blocks of another term of the event (US-142); the copies are independent rows
   * and nobody is notified. In one transaction, so a failed replace leaves the program as it was.
   * `null` when a term is not the event's.
   */
  async copy(
    { eventId, organizationId }: Scope,
    termId: string,
    sourceTermId: string,
    strategy: ProgramCopyStrategy,
  ): Promise<ProgramCopyPlan | null> {
    return this.prisma.$transaction(async (tx) => {
      const [source, target] = await Promise.all(
        [sourceTermId, termId].map((id) =>
          tx.term.findFirst({
            where: { id, eventId, organizationId },
            include: { programBlocks: { orderBy: blockOrder } },
          }),
        ),
      )
      if (!source || !target) return null
      if (target.cancelledAt || source.cancelledAt)
        throw new AppException(HttpStatus.BAD_REQUEST, "TERM_CANCELLED")
      if (source.id === target.id || !source.programBlocks.length) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }
      const toInput = (block: (typeof source.programBlocks)[number]): ProgramInput => ({
        date: isoDay(block.date),
        startTime: block.startTime,
        endTime: block.endTime,
        name: block.name,
        place: block.place,
        description: block.description,
      })
      const plan = planProgramCopy(
        {
          term: { startsOn: isoDay(source.startsOn), endsOn: isoDay(source.endsOn) },
          blocks: source.programBlocks.map(toInput),
        },
        { startsOn: isoDay(target.startsOn), endsOn: isoDay(target.endsOn) },
        strategy === "REPLACE" ? [] : target.programBlocks.map(toInput),
      )
      // Nothing fits into the target: refuse, so a replace never wipes the program for no copy.
      if (!plan.blocks.length) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      if (strategy === "REPLACE")
        await tx.programBlock.deleteMany({ where: { termId, organizationId } })
      await tx.programBlock.createMany({
        data: plan.blocks.map((input) => ({ organizationId, termId, ...toData(input) })),
      })
      return plan
    })
  }

  /**
   * The program of the terms the participant is confirmed in: only `CONFIRMED` terms count, so a
   * waitlisted, cancelled or (with US-109) archived application in a term does not see it. Read
   * straight from the database, so a change shows at once.
   * `null` when the application is not the participant's.
   */
  async ofApplication(userId: string, applicationId: string): Promise<ApplicationProgram | null> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        event: { select: { name: true } },
        terms: {
          where: { status: "CONFIRMED", term: { cancelledAt: null } },
          orderBy: { term: { startsOn: "asc" } },
          include: { term: { include: { programBlocks: { orderBy: blockOrder } } } },
        },
      },
    })
    if (!application) return null
    return {
      participantName: `${application.firstName} ${application.lastName}`.trim(),
      eventName: application.event.name,
      terms: application.terms.map(({ term }) => termProgram(term)),
    }
  }
}
