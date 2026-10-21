import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import {
  MyApplicationRecord,
  WaitlistedArrival,
} from "@/modules/participants/domain/my-application"
import { Injectable } from "@nestjs/common"

const include = {
  event: { select: { name: true } },
  organization: { select: { bankAccount: true } },
  terms: { include: { term: true } },
  payments: { select: { amountCzk: true } },
} as const

type Row = Prisma.ApplicationGetPayload<{ include: typeof include }>

/** The only place of the participant's application overview that touches the database. */
@Injectable()
export class MyApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first. Only applications attached to this account. */
  async findAllOfUser(userId: string): Promise<MyApplicationRecord[]> {
    const rows = await this.prisma.application.findMany({
      where: { userId },
      include,
      orderBy: { submittedAt: "desc" },
    })
    return rows.map(toRecord)
  }

  /** `null` when the application does not exist or belongs to someone else. */
  async findOneOfUser(userId: string, applicationId: string): Promise<MyApplicationRecord | null> {
    const row = await this.findRow(userId, applicationId)
    return row ? toRecord(row) : null
  }

  /** Everyone waitlisted in the given terms, by term — the waiting list order is derived from it. */
  async findWaitlists(termIds: string[]): Promise<Map<string, WaitlistedArrival[]>> {
    const rows = await this.prisma.applicationTerm.findMany({
      where: { termId: { in: termIds }, status: "WAITLISTED" },
      select: { termId: true, application: { select: { submittedAt: true, number: true } } },
    })
    const queues = new Map<string, WaitlistedArrival[]>()
    for (const { termId, application } of rows) {
      queues.set(termId, [...(queues.get(termId) ?? []), application])
    }
    return queues
  }

  private findRow(userId: string, applicationId: string): Promise<Row | null> {
    return this.prisma.application.findFirst({ where: { id: applicationId, userId }, include })
  }
}

function toRecord(row: Row): MyApplicationRecord {
  return {
    id: row.id,
    number: row.number,
    submittedAt: row.submittedAt,
    firstName: row.firstName,
    lastName: row.lastName,
    eventName: row.event.name,
    bankAccount: row.organization.bankAccount,
    terms: row.terms.map(({ term, status, priceCzk }) => ({
      termId: term.id,
      name: term.name,
      startsOn: term.startsOn,
      endsOn: term.endsOn,
      status,
      priceCzk,
    })),
    payments: row.payments,
  }
}
