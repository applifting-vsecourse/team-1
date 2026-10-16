import { PrismaService } from '@/core/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OrganizationAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMemberOrganizationIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    return memberships.map((membership) => membership.organizationId);
  }

  async isMember(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { id: true },
    });
    return membership !== null;
  }

  async findEventOrganizationId(eventId: string): Promise<string | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
    return event?.organizationId ?? null;
  }

  async findApplicationOrganizationId(
    applicationId: string,
  ): Promise<string | null> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { organizationId: true },
    });
    return application?.organizationId ?? null;
  }
}
