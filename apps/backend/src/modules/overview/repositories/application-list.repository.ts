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
        number: true,
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        gender: true,
        email: true,
        submittedAt: true,
        event: { select: { evaluationMode: true } },
        terms: {
          include: {
            term: { include: { rooms: { select: { capacity: true, gender: true } } } },
            payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
          },
          orderBy: { term: { startsOn: "asc" } },
        },
      },
      orderBy: [{ submittedAt: "desc" }, { number: "desc" }],
    })
    return rows.map(({ event, ...row }) => ({
      ...row,
      evaluationMode: event.evaluationMode,
      terms: row.terms.map(({ status, priceCzk, term, payments }) => ({
        id: term.id,
        termNumber: term.number,
        name: term.name,
        startsOn: term.startsOn,
        endsOn: term.endsOn,
        roomMode: term.roomMode,
        rooms: term.rooms,
        status,
        priceCzk,
        payments,
      })),
    }))
  }
}
