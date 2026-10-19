import { PrismaService } from '@/core/prisma/prisma.service';
import {
  api,
  connectTestPrisma,
  resetAndSeed,
} from '@/test/integration/test-api';

type PublicEventBody = {
  name: string;
  terms: {
    id: string;
    name: string;
    startsOn: string;
    endsOn: string;
    priceCzk: number;
  }[];
};

describe('public event for the application form (integration)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await connectTestPrisma();
    await resetAndSeed(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('opens without a session and lists the terms with prices by start date', async () => {
    const response = await fetch(api('/public/events/demo-letni-kemp-2027'));

    expect(response.status).toBe(200);
    const body = (await response.json()) as PublicEventBody;
    expect(body.name).toBe('Letní kemp 2027');
    expect(body.terms.map((term) => term.name)).toEqual([
      '1. týden',
      '2. týden',
    ]);
    expect(body.terms[0]).toMatchObject({
      startsOn: '2027-07-04',
      priceCzk: 4500,
    });
  });

  it('exposes nothing of the organization', async () => {
    const response = await fetch(api('/public/events/demo-letni-kemp-2027'));
    const text = await response.text();

    expect(text).not.toContain('organizationId');
    expect(text).not.toContain('bankAccount');
    expect(text).not.toContain('2900123456');
  });

  it('answers an unknown link with 404 and a code to translate', async () => {
    const response = await fetch(api('/public/events/does-not-exist'));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('answers an event without rooms like an unknown link', async () => {
    const event = await prisma.event.findUniqueOrThrow({
      where: { publicToken: 'demo-horsky-vikend-2027' },
    });
    await prisma.room.deleteMany({ where: { eventId: event.id } });

    const response = await fetch(api('/public/events/demo-horsky-vikend-2027'));

    expect(response.status).toBe(404);
  });
});
