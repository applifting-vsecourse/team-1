// Example HTTP integration test — the pattern to copy: the built server and a
// real database, requests over HTTP with a BetterAuth session cookie.
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  api,
  connectTestPrisma,
  resetAndSeed,
  signIn,
} from '@/test/integration/test-api';

describe('accounts (integration)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await connectTestPrisma();
    await resetAndSeed(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('refuses public sign-up — nobody registers in sprint 1', async () => {
    const response = await fetch(api('/auth/sign-up/email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        password: 'password123',
        name: 'New',
      }),
    });

    expect(response.status).toBe(400);
    expect(
      await prisma.user.count({ where: { email: 'new@example.com' } }),
    ).toBe(0);
  });

  it('answers /api/me without a session with 401', async () => {
    const response = await fetch(api('/me'));
    expect(response.status).toBe(401);
  });

  it('rejects a wrong password', async () => {
    await expect(
      signIn('organizator@example.com', 'wrong-password'),
    ).rejects.toThrow();
  });

  it('returns an organizer with all their organizations', async () => {
    const cookie = await signIn('organizator3@example.com', 'password3');

    const response = await fetch(api('/me'), { headers: { Cookie: cookie } });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      accountType: string;
      organizations: unknown[];
    };
    expect(body.accountType).toBe('ORGANIZER');
    expect(body.organizations).toHaveLength(2);
  });

  it('returns a participant without organizations', async () => {
    const cookie = await signIn('ucastnik@example.com', 'password4');

    const response = await fetch(api('/me'), { headers: { Cookie: cookie } });

    expect(await response.json()).toMatchObject({
      accountType: 'PARTICIPANT',
      mustSetPassword: false,
      organizations: [],
    });
  });
});
