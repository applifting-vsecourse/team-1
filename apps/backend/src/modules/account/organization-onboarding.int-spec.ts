import { PrismaService } from "@/core/prisma/prisma.service"
import {
  api,
  connectTestPrisma,
  latestEmailTo,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

const frontend = process.env.FRONTEND_URL ?? "http://localhost:3050"
const jsonHeaders = { "Content-Type": "application/json", Origin: frontend }

const post = (path: string, body: unknown, cookie?: string): Promise<Response> =>
  fetch(api(path), {
    method: "POST",
    headers: { ...jsonHeaders, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })

describe("organization self-onboarding (integration)", () => {
  let prisma: PrismaService

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("registers an organizer, verifies the e-mail, completes the organization and creates an event", async () => {
    const email = "new-organizer@example.com"
    const callbackURL = `${frontend}/organizer/verify-email?email=${encodeURIComponent(email)}`
    const signUp = await fetch(api("/auth/sign-up/email"), {
      method: "POST",
      headers: { ...jsonHeaders, "Accept-Language": "cs" },
      body: JSON.stringify({ email, password: "password123", name: email, callbackURL }),
    })
    expect(signUp.status).toBe(200)
    expect(signUp.headers.getSetCookie()).toHaveLength(0)
    expect(await prisma.user.findUniqueOrThrow({ where: { email } })).toMatchObject({
      emailVerified: false,
      accountType: "ORGANIZER",
      locale: "cs",
    })

    const unverifiedLogin = await post("/auth/sign-in/email", { email, password: "password123" })
    expect(unverifiedLogin.status).toBe(403)
    expect(unverifiedLogin.headers.getSetCookie()).toHaveLength(0)
    expect((await post("/organizer/organizations", { name: "Lipno Events" })).status).toBe(401)

    const verification = await latestEmailTo(email)
    expect(verification?.links[0]).toBeDefined()
    const click = await fetch(verification!.links[0]!, { redirect: "manual" })
    expect(click.status).toBe(302)
    expect(click.headers.get("location")).toBe(callbackURL)
    const cookie = click.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ")
    expect(cookie).toBeTruthy()
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified).toBe(true)

    const create = await post("/organizer/organizations", { name: "  Lipno Events  " }, cookie)
    expect(create.status).toBe(201)
    const organization = (await create.json()) as { id: string; name: string; bankAccount: string }
    expect(organization).toMatchObject({ name: "Lipno Events", bankAccount: "" })
    const duplicate = await post("/organizer/organizations", { name: "Another" }, cookie)
    expect(duplicate.status).toBe(409)
    expect(await duplicate.json()).toMatchObject({ code: "ORGANIZATION_ALREADY_EXISTS" })

    const beforeProfile = await post("/organizer/events", { name: "First event" }, cookie)
    expect(beforeProfile.status).toBe(403)
    expect(await beforeProfile.json()).toMatchObject({ code: "ORGANIZATION_PROFILE_INCOMPLETE" })

    const invalid = await fetch(api(`/organizer/organizations/${organization.id}/profile`), {
      method: "PUT",
      headers: { ...jsonHeaders, Cookie: cookie },
      body: JSON.stringify({ contactEmail: "info@lipno.example.cz", bankAccount: "invalid" }),
    })
    expect(invalid.status).toBe(400)

    // 201 characters, each part within its own limit, so only the length of the whole is wrong.
    const longEmail = `${"a".repeat(60)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(12)}`
    expect(longEmail).toHaveLength(201)
    const tooLong = await fetch(api(`/organizer/organizations/${organization.id}/profile`), {
      method: "PUT",
      headers: { ...jsonHeaders, Cookie: cookie },
      body: JSON.stringify({
        contactEmail: longEmail,
        bankAccount: "2900123456/2010",
      }),
    })
    expect(tooLong.status).toBe(400)

    const save = await fetch(api(`/organizer/organizations/${organization.id}/profile`), {
      method: "PUT",
      headers: { ...jsonHeaders, Cookie: cookie },
      body: JSON.stringify({
        contactEmail: "info@lipno.example.cz",
        contactPhone: "+420 777 123 456",
        bankAccount: "2900123456/2010",
      }),
    })
    expect(save.status).toBe(200)
    expect(await save.json()).toMatchObject({ contactEmail: "info@lipno.example.cz" })
    expect((await post("/organizer/events", { name: "First event" }, cookie)).status).toBe(201)

    const otherCookie = await signIn("organizator@example.com", "password1")
    const foreign = await fetch(api(`/organizer/organizations/${organization.id}`), {
      headers: { Cookie: otherCookie },
    })
    expect(foreign.status).toBe(403)
  })

  it("refuses an organizer password shorter than eight characters", async () => {
    const response = await post("/auth/sign-up/email", {
      email: "short-password@example.com",
      password: "short",
      name: "Short",
    })
    expect(response.status).toBe(400)
    expect(await prisma.user.count({ where: { email: "short-password@example.com" } })).toBe(0)
  })

  it("does not allow a participant to create an organization", async () => {
    const cookie = await signIn("ucastnik@example.com", "password4")
    expect((await post("/organizer/organizations", { name: "No" }, cookie)).status).toBe(403)
  })
})
