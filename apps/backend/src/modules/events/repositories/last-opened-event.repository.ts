import { PrismaService } from "@/core/prisma/prisma.service"
import { Injectable } from "@nestjs/common"

@Injectable()
export class LastOpenedEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, eventId: string): Promise<void> {
    await this.prisma.lastOpenedEvent.upsert({
      where: { userId },
      create: { userId, eventId },
      update: { eventId, openedAt: new Date() },
    })
  }

  /** The stored event only while it belongs to one of the given organizations. */
  async findAccessibleEventId(userId: string, organizationIds: string[]): Promise<string | null> {
    const row = await this.prisma.lastOpenedEvent.findFirst({
      where: { userId, event: { organizationId: { in: organizationIds } } },
      select: { eventId: true },
    })
    return row?.eventId ?? null
  }
}
