import { PrismaService } from "@/core/prisma/prisma.service"
import { canArchiveTerm } from "@/modules/applications/domain/application-archive"
import { Injectable } from "@nestjs/common"

@Injectable()
export class ApplicationArchiveRepository {
  constructor(private readonly prisma: PrismaService) {}

  async archiveFinished(today: Date): Promise<number> {
    const events = await this.prisma.event.findMany({
      where: {
        terms: {
          some: {
            endsOn: { lt: today },
            cancelledAt: null,
            applicationTerms: { some: { status: "CONFIRMED" } },
          },
        },
      },
      select: { id: true, organizationId: true },
    })
    let archived = 0
    for (const event of events) {
      archived += await this.prisma.$transaction(async (tx) => {
        // Status changes use the event lock; payment writes lock their application.
        // Take both in a stable order before reading the status and balance.
        await tx.$queryRaw`SELECT id FROM event WHERE id = ${event.id} AND "organizationId" = ${event.organizationId} FOR UPDATE`
        await tx.$queryRaw`SELECT id FROM application WHERE "eventId" = ${event.id} AND "organizationId" = ${event.organizationId} ORDER BY id FOR UPDATE`
        const terms = await tx.applicationTerm.findMany({
          where: {
            organizationId: event.organizationId,
            status: "CONFIRMED",
            term: { eventId: event.id, endsOn: { lt: today }, cancelledAt: null },
          },
          include: {
            term: { select: { endsOn: true, cancelledAt: true } },
            payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
          },
        })
        const paid = terms.filter((term) =>
          canArchiveTerm({ ...term, ...term.term }, term.payments, today),
        )
        for (const term of paid) {
          await tx.applicationTerm.update({
            where: { id: term.id, organizationId: event.organizationId },
            data: { status: "ARCHIVED" },
          })
          await tx.applicationTermStatusChange.create({
            data: {
              organizationId: term.organizationId,
              applicationTermId: term.id,
              fromStatus: "CONFIRMED",
              toStatus: "ARCHIVED",
              changedById: null,
            },
          })
        }
        return paid.length
      })
    }
    return archived
  }
}
