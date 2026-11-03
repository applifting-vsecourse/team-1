// US-125: a signed-in user changes the sign-in e-mail; it takes effect only after the
// link sent to the new address is clicked. Every test makes its own accounts, so the
// e-mails of the seeded and demo accounts never change.
import { createHmac, randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import {
  api,
  connectTestPrisma,
  hasSentNothingTo,
  latestEmailTo,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

const frontend = process.env.FRONTEND_URL ?? "http://localhost:3050"
const json = { "Content-Type": "application/json", Origin: frontend }

describe("changing the sign-in e-mail (integration)", () => {
  let prisma: PrismaService
  let counter = 0

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  /** A fresh account with the password of a seeded one (the hash is copied, nothing is hashed here). */
  async function createAccount(
    like: { email: string; password: string },
    locale: "en" | "cs" = "cs",
  ): Promise<{ id: string; email: string; password: string }> {
    const source = await prisma.user.findUniqueOrThrow({
      where: { email: like.email },
      include: { accounts: { where: { providerId: "credential" } } },
    })
    const id = randomUUID()
    const email = `change-${++counter}-${id.slice(0, 8)}@example.com`
    const now = new Date()
    await prisma.user.create({
      data: {
        id,
        email,
        name: "Eva Malá",
        emailVerified: true,
        accountType: source.accountType,
        locale,
        createdAt: now,
        updatedAt: now,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: id,
            providerId: "credential",
            issuer: source.accounts[0].issuer,
            password: source.accounts[0].password,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    })
    return { id, email, password: like.password }
  }

  const participant = (): ReturnType<typeof createAccount> =>
    createAccount({ email: "ucastnik@example.com", password: "password4" })

  const requestChange = (cookie: string | undefined, body: unknown): Promise<Response> =>
    fetch(api("/me/email-change"), {
      method: "POST",
      headers: { ...json, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    })

  /** Clicks the link of the e-mail the way the browser does: the server answers with a redirect. */
  const clickLink = (link: string, cookie?: string): Promise<Response> =>
    fetch(link, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} })

  /** A change token like the one BetterAuth e-mails (HS256 over the server secret), for cases that cannot wait an hour. */
  function changeToken(email: string, updateTo: string, expiresInSeconds: number): string {
    const encode = (value: object): string =>
      Buffer.from(JSON.stringify(value)).toString("base64url")
    const now = Math.floor(Date.now() / 1000)
    const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
      email,
      updateTo,
      requestType: "change-email-verification",
      iat: now,
      exp: now + expiresInSeconds,
    })}`
    const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "")
      .update(body)
      .digest("base64url")
    return `${body}.${signature}`
  }

  const verifyUrl = (token: string): string =>
    `${api("/auth/verify-email")}?token=${token}&callbackURL=${encodeURIComponent(`${frontend}/email-change`)}`

  it("refuses a request without a session", async () => {
    const response = await requestChange(undefined, { newEmail: "someone@example.com" })

    expect(response.status).toBe(401)
    expect(await hasSentNothingTo("someone@example.com")).toBe(true)
  })

  it("sends the link to the new address only; the account keeps the old e-mail meanwhile", async () => {
    const account = await participant()
    const cookie = await signIn(account.email, account.password)
    const newEmail = `new-${account.email}`

    const response = await requestChange(cookie, { newEmail: newEmail.toUpperCase() })

    expect(response.status).toBe(204)
    const mail = await latestEmailTo(newEmail)
    expect(mail?.subject).toBe("Potvrď změnu e-mailu")
    expect(mail?.links.some((link) => link.includes("/auth/verify-email?token="))).toBe(true)
    expect(await hasSentNothingTo(account.email)).toBe(true)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).email).toBe(
      account.email,
    )
    await expect(signIn(account.email, account.password)).resolves.toBeTruthy()
    await expect(signIn(newEmail, account.password)).rejects.toThrow()
  })

  it("writes the e-mail in the language of the account", async () => {
    const account = await createAccount(
      { email: "ucastnik@example.com", password: "password4" },
      "en",
    )
    const cookie = await signIn(account.email, account.password)
    const newEmail = `en-${account.email}`

    await requestChange(cookie, { newEmail })

    expect((await latestEmailTo(newEmail))?.subject).toBe("Confirm your e-mail change")
  })

  it("changes the e-mail on the click: the new one signs in, the old one no longer does", async () => {
    const account = await participant()
    const cookie = await signIn(account.email, account.password)
    const newEmail = `confirmed-${account.email}`
    await requestChange(cookie, { newEmail })
    const link = (await latestEmailTo(newEmail))?.links.find((item) =>
      item.includes("verify-email"),
    )

    const clicked = await clickLink(link ?? "", cookie)

    expect(clicked.status).toBe(302)
    expect(clicked.headers.get("location")).toBe(`${frontend}/email-change`)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).email).toBe(
      newEmail,
    )
    await expect(signIn(newEmail, account.password)).resolves.toBeTruthy()
    await expect(signIn(account.email, account.password)).rejects.toThrow()
    const me = await fetch(api("/me"), { headers: { Cookie: cookie } })
    expect(await me.json()).toMatchObject({ id: account.id, email: newEmail })
  })

  it("keeps the applications on the account and leaves the e-mail inside them unchanged", async () => {
    const account = await participant()
    const seeded = await prisma.application.findFirstOrThrow()
    const application = await prisma.application.create({
      data: {
        organizationId: seeded.organizationId,
        eventId: seeded.eventId,
        firstName: seeded.firstName,
        lastName: seeded.lastName,
        birthDate: seeded.birthDate,
        gender: seeded.gender,
        consentAt: seeded.consentAt,
        locale: seeded.locale,
        userId: account.id,
        email: account.email,
        accessToken: randomUUID(),
      },
    })
    const cookie = await signIn(account.email, account.password)
    const newEmail = `kept-${account.email}`
    await requestChange(cookie, { newEmail })
    const link = (await latestEmailTo(newEmail))?.links.find((item) =>
      item.includes("verify-email"),
    )

    await clickLink(link ?? "", cookie)

    const after = await prisma.application.findUniqueOrThrow({ where: { id: application.id } })
    expect(after.userId).toBe(account.id)
    expect(after.email).toBe(account.email)
    expect(after.accessToken).toBe(application.accessToken)
  })

  it("lets a used link fail: the second click redirects with an error and changes nothing", async () => {
    const account = await participant()
    const cookie = await signIn(account.email, account.password)
    const newEmail = `twice-${account.email}`
    await requestChange(cookie, { newEmail })
    const link = (await latestEmailTo(newEmail))?.links.find((item) =>
      item.includes("verify-email"),
    )
    await clickLink(link ?? "", cookie)

    const again = await clickLink(link ?? "")

    expect(again.status).toBe(302)
    expect(again.headers.get("location")).toContain(`${frontend}/email-change?error=`)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).email).toBe(
      newEmail,
    )
  })

  it("redirects an expired link with an error and changes nothing", async () => {
    const account = await participant()
    const newEmail = `expired-${account.email}`

    const response = await clickLink(verifyUrl(changeToken(account.email, newEmail, -60)))

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe(`${frontend}/email-change?error=TOKEN_EXPIRED`)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).email).toBe(
      account.email,
    )
  })

  it("redirects a link nobody signed with an error", async () => {
    const response = await clickLink(verifyUrl("not.a.token"))

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe(`${frontend}/email-change?error=INVALID_TOKEN`)
  })

  it.each([
    ["another participant", "ucastnik@example.com"],
    ["an organizer", "organizator@example.com"],
  ])("refuses the e-mail of %s with a generic error and sends nothing", async (_who, taken) => {
    const account = await participant()
    const cookie = await signIn(account.email, account.password)

    const response = await requestChange(cookie, { newEmail: taken })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ statusCode: 400, code: "VALIDATION_FAILED" })
    expect(await hasSentNothingTo(taken)).toBe(true)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: account.id } })).email).toBe(
      account.email,
    )
  })

  it("refuses the e-mail the account already has", async () => {
    const account = await participant()
    const cookie = await signIn(account.email, account.password)

    const response = await requestChange(cookie, { newEmail: account.email.toUpperCase() })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "VALIDATION_FAILED" })
  })

  it.each([
    { newEmail: "eva.nova@" },
    { newEmail: "" },
    {},
    { newEmail: "a@example.com", id: "x" },
  ])("refuses an invalid body %j", async (body) => {
    const account = await participant()
    const cookie = await signIn(account.email, account.password)

    const response = await requestChange(cookie, body)

    expect(response.status).toBe(400)
  })

  it("works for an organizer too", async () => {
    const account = await createAccount({ email: "organizator@example.com", password: "password1" })
    const cookie = await signIn(account.email, account.password)
    const newEmail = `org-${account.email}`

    const response = await requestChange(cookie, { newEmail })

    expect(response.status).toBe(204)
    expect((await latestEmailTo(newEmail))?.links.length).toBeGreaterThan(0)
  })
})
