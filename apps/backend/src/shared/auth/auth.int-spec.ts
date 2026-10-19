// US-02: signing in and out, one generic failure, and a participant locked out
// of the organizer area. Real server and database, like account.int-spec.ts.
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  api,
  connectTestPrisma,
  resetAndSeed,
  signIn,
} from '@/test/integration/test-api';

const origin = process.env.FRONTEND_URL ?? 'http://localhost:3050';

async function rawSignIn(email: string, password: string): Promise<Response> {
  return fetch(api('/auth/sign-in/email'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email, password }),
  });
}

describe('sign-in and sign-out (integration)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await connectTestPrisma();
    await resetAndSeed(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('signs an organizer in with e-mail and password', async () => {
    const cookie = await signIn('organizator@example.com', 'password1');

    const me = await fetch(api('/me'), { headers: { Cookie: cookie } });

    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ accountType: 'ORGANIZER' });
  });

  it('signs a participant in with e-mail and password', async () => {
    const cookie = await signIn('ucastnik@example.com', 'password4');

    const me = await fetch(api('/me'), { headers: { Cookie: cookie } });

    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ accountType: 'PARTICIPANT' });
  });

  it('answers a wrong password and an unknown e-mail identically', async () => {
    const wrongPassword = await rawSignIn(
      'organizator@example.com',
      'wrong-password',
    );
    const unknownEmail = await rawSignIn('nobody@example.com', 'password1');

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(await unknownEmail.json()).toEqual(await wrongPassword.json());
    expect(wrongPassword.headers.getSetCookie()).toHaveLength(0);
  });

  it('lets an organizer into the organizer area', async () => {
    const cookie = await signIn('organizator@example.com', 'password1');

    const response = await fetch(api('/organizer/profile'), {
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(200);
  });

  it('answers a participant in the organizer area with 403 and no content', async () => {
    const cookie = await signIn('ucastnik@example.com', 'password4');

    const response = await fetch(api('/organizer/profile'), {
      headers: { Cookie: cookie },
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    expect(body).not.toHaveProperty('organizations');
    expect(body).not.toHaveProperty('email');
  });

  it('answers the organizer area without a session with 401', async () => {
    const response = await fetch(api('/organizer/profile'));

    expect(response.status).toBe(401);
  });

  it('ends the session on sign-out', async () => {
    const cookie = await signIn('organizator2@example.com', 'password2');
    const sessionsBefore = await prisma.session.count({
      where: { user: { email: 'organizator2@example.com' } },
    });

    const signOut = await fetch(api('/auth/sign-out'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: cookie,
      },
      body: '{}',
    });
    const me = await fetch(api('/me'), { headers: { Cookie: cookie } });

    expect(signOut.status).toBe(200);
    expect(me.status).toBe(401);
    expect(
      await prisma.session.count({
        where: { user: { email: 'organizator2@example.com' } },
      }),
    ).toBe(sessionsBefore - 1);
  });
});
