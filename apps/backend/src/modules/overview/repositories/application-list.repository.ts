import { PrismaService } from "@/core/prisma/prisma.service"
import { ListedApplication } from "@/modules/overview/domain/application-list"
import { Injectable } from "@nestjs/common"

@Injectable()
export class ApplicationListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(eventId: string, organizationId: string): Promise<ListedApplication[]> {
    const rows = await this.prisma.application.findMany({
      where: { eventId, organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        gender: true,
        email: true,
        submittedAt: true,
        terms: { include: { term: true }, orderBy: { term: { startsOn: "asc" } } },
        payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
      },
      orderBy: [{ submittedAt: "desc" }, { number: "desc" }],
    })
    return rows.map((row) => ({
      ...row,
      terms: row.terms.map(({ status, priceCzk, term }) => ({
        id: term.id,
        name: term.name,
        startsOn: term.startsOn,
        endsOn: term.endsOn,
        status,
        priceCzk,
      })),
    }))
  }
}
