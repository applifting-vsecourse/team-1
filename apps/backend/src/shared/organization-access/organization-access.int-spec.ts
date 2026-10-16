// Data isolation between organizations against the real database (US-10, US-73).
import { PrismaService } from '@/core/prisma/prisma.service';
import { Identity } from '@/shared/auth/domain/identity';
import { connectTestPrisma, resetAndSeed } from '@/test/integration/test-api';
import { ForbiddenException } from '@nestjs/common';
import { OrganizationAccessRepository } from './organization-access.repository';
import { OrganizationAccessService } from './organization-access.service';

describe('OrganizationAccessService (integration)', () => {
  let prisma: PrismaService;
  let access: OrganizationAccessService;

  const identityOf = async (email: string): Promise<Identity> => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    return new Identity(
      user.id,
      user.email,
      user.name,
      user.accountType,
      user.mustSetPassword,
      user.locale,
    );
  };
  const eventIdOf = async (publicToken: string): Promise<string> =>
    (await prisma.event.findUniqueOrThrow({ where: { publicToken } })).id;
  const applicationIdOf = async (eventId: string): Promise<string> =>
    (await prisma.application.findFirstOrThrow({ where: { eventId } })).id;

  beforeAll(async () => {
    prisma = await connectTestPrisma();
    await resetAndSeed(prisma);
    access = new OrganizationAccessService(
      new OrganizationAccessRepository(prisma),
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lets organizer A into their own event and its applications', async () => {
    const organizerA = await identityOf('organizator@example.com');
    const summerCamp = await eventIdOf('demo-letni-kemp-2027');

    await expect(
      access.assertCanAccessEvent(organizerA, summerCamp),
    ).resolves.toHaveProperty('organizationId');
    await expect(
      access.assertCanAccessApplication(
        organizerA,
        await applicationIdOf(summerCamp),
      ),
    ).resolves.toHaveProperty('organizationId');
  });

  it('gives organizer A nothing of organization B — event or application', async () => {
    const organizerA = await identityOf('organizator@example.com');
    const mountainWeekend = await eventIdOf('demo-horsky-vikend-2027');

    await expect(
      access.assertCanAccessEvent(organizerA, mountainWeekend),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      access.assertCanAccessApplication(
        organizerA,
        await applicationIdOf(mountainWeekend),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('scopes list queries to the organizer’s own organizations', async () => {
    const organizerA = await identityOf('organizator@example.com');
    const organizationIds = await access.getOrganizationIds(organizerA);

    const visibleEvents = await prisma.event.findMany({
      where: { organizationId: { in: organizationIds } },
    });
    expect(visibleEvents.map((event) => event.publicToken)).toEqual([
      'demo-letni-kemp-2027',
    ]);
  });

  it('lets an organizer of both organizations into both', async () => {
    const organizerBoth = await identityOf('organizator3@example.com');
    expect(await access.getOrganizationIds(organizerBoth)).toHaveLength(2);
    await expect(
      access.assertCanAccessEvent(
        organizerBoth,
        await eventIdOf('demo-horsky-vikend-2027'),
      ),
    ).resolves.toHaveProperty('organizationId');
  });

  it('keeps a participant out even of the event they applied to', async () => {
    const participant = await identityOf('ucastnik@example.com');
    await expect(
      access.assertCanAccessEvent(
        participant,
        await eventIdOf('demo-letni-kemp-2027'),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
