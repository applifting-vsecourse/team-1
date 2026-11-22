// US-91: the organizer writes posts of the event board for chosen terms; the applicants who are
// confirmed or substitutes in one of them read them, are told in the bell and "new" goes away
// when they open a post.
import { randomUUID } from "node:crypto"
import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Term = { id: string; name: string | null; startsOn: string; endsOn: string }
type OrganizerPost = {
  id: string
  title: string
  body: string
  source: string
  terms: Term[]
}
type ParticipantPost = {
  id: string
  title: string
  excerpt: string
  eventName: string
  terms: Term[]
  isNew: boolean
  body?: string
}
type Notification = { kind: string; type: string; applicationId: string; readAt: string | null }

describe("board (integration)", () => {
  let prisma: PrismaService
  let organizer: string
  let otherOrganizer: string
  let participant: string
  let otherParticipant: string
  let participantId: string
  let organizationId: string
  let eventId: string
  let otherEventId: string
  let t1: string
  let t2: string
  let cancelledTerm: string
  let otherEventTerm: string
  let counter = 0

  const send = (path: string, cookie?: string, method = "GET", body?: unknown): Promise<Response> =>
    fetch(api(path), {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const base = () => `/organizer/events/${eventId}/board/posts`
  const draft = (patch: object = {}) => ({
    title: "Odjezd a sraz",
    body: "Sraz v 9:00\nu nádraží",
    termIds: [t1, t2],
    ...patch,
  })
  const publish = async (patch: object = {}): Promise<OrganizerPost> => {
    const response = await send(base(), organizer, "POST", draft(patch))
    expect(response.status).toBe(201)
    return response.json()
  }
  const board = async (cookie = participant): Promise<ParticipantPost[]> =>
    (await send("/participant/board", cookie)).json()
  const summary = async (cookie = participant) =>
    (await (await send("/participant/board/summary", cookie)).json()) as {
      unreadCount: number
      latest: { id: string; title: string } | null
    }
  const bell = async (cookie = participant): Promise<Notification[]> =>
    ((await (await send("/notifications", cookie)).json()) as Notification[]).filter(
      (item) => item.type === "BOARD",
    )
  const bellCount = async (cookie = participant): Promise<number> =>
    ((await (await send("/notifications/unread-count", cookie)).json()) as { count: number }).count

  /** An application of the account (null = nobody's) with one term in the given status. */
  const apply = async (
    userId: string | null,
    termId: string,
    status: "CONFIRMED" | "WAITLISTED" | "TO_EVALUATE" | "CANCELLED",
    owed = false,
  ): Promise<string> => {
    counter += 1
    const application = await prisma.application.create({
      data: {
        organizationId,
        eventId: termId === otherEventTerm ? otherEventId : eventId,
        userId,
        accessToken: `us-91-${counter}-${randomUUID()}`,
        firstName: "Dítě",
        lastName: `Číslo${counter}`,
        birthDate: new Date("2012-01-01"),
        gender: "FEMALE",
        email: `us91-${counter}@example.com`,
        consentAt: new Date(),
        terms: { create: [{ organizationId, termId, status, priceCzk: owed ? 5000 : 0 }] },
      },
    })
    return application.id
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    organizer = await signIn("organizator@example.com", "password1")
    otherOrganizer = await signIn("organizator2@example.com", "password2")
    participant = await signIn("ucastnik@example.com", "password4")
    otherParticipant = await signIn("ucastnik2@example.com", "password5")
    participantId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
    ).id
    const member = await prisma.user.findUniqueOrThrow({
      where: { email: "organizator@example.com" },
      include: { memberships: true },
    })
    organizationId = member.memberships[0].organizationId
    const makeEvent = (name: string, terms: Prisma.TermUncheckedCreateWithoutEventInput[]) =>
      prisma.event.create({
        data: {
          organizationId,
          name,
          publicToken: `us91-${randomUUID()}`,
          terms: { create: terms },
        },
        include: { terms: { orderBy: { number: "asc" } } },
      })
    const term = (
      number: number,
      patch: Partial<Prisma.TermUncheckedCreateWithoutEventInput> = {},
    ): Prisma.TermUncheckedCreateWithoutEventInput => ({
      organizationId,
      number,
      name: `T${number}`,
      startsOn: new Date(`2027-0${number}-10`),
      endsOn: new Date(`2027-0${number}-16`),
      priceCzk: 1000,
      ...patch,
    })
    const event = await makeEvent("US-91 event", [
      term(1),
      term(2),
      term(3, { cancelledAt: new Date("2026-11-01") }),
    ])
    eventId = event.id
    ;[t1, t2, cancelledTerm] = event.terms.map((item) => item.id)
    const other = await makeEvent("US-91 other event", [term(1)])
    otherEventId = other.id
    otherEventTerm = other.terms[0].id
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })
  beforeEach(async () => {
    await prisma.application.deleteMany({ where: { eventId: { in: [eventId, otherEventId] } } })
    await prisma.eventPost.deleteMany({ where: { eventId: { in: [eventId, otherEventId] } } })
    await prisma.notification.deleteMany()
  })

  describe("access", () => {
    it.each([
      ["GET", () => base()],
      ["POST", () => base()],
      ["GET", () => `${base()}/x`],
      ["PUT", () => `${base()}/x`],
      ["DELETE", () => `${base()}/x`],
      ["GET", () => "/participant/board"],
      ["GET", () => "/participant/board/summary"],
      ["GET", () => "/participant/board/posts/x"],
      ["POST", () => "/participant/board/posts/x/read"],
    ])("answers %s %s without a session with 401", async (method, path) => {
      expect(
        (await send(path(), undefined, method, method === "GET" ? undefined : {})).status,
      ).toBe(401)
    })

    it("keeps the participant out of the organizer's board and the organizer out of theirs", async () => {
      expect((await send(base(), participant)).status).toBe(403)
      expect((await send("/participant/board", organizer)).status).toBe(403)
    })

    it("gives another organization 403 on every call, without content", async () => {
      const post = await publish()
      for (const [method, path] of [
        ["GET", base()],
        ["POST", base()],
        ["GET", `${base()}/${post.id}`],
        ["PUT", `${base()}/${post.id}`],
        ["DELETE", `${base()}/${post.id}`],
      ]) {
        const response = await send(
          path,
          otherOrganizer,
          method,
          method === "GET" ? undefined : draft(),
        )
        expect(response.status).toBe(403)
      }
      expect(await prisma.eventPost.count({ where: { id: post.id } })).toBe(1)
    })
  })

  describe("the organizer's posts", () => {
    it("publishes a post for the chosen terms and lists the newest first", async () => {
      const first = await publish({ title: "První", termIds: [t1] })
      const second = await publish({ title: "Druhý" })

      expect(second).toMatchObject({
        title: "Druhý",
        body: "Sraz v 9:00\nu nádraží",
        source: "MANUAL",
      })
      expect(second.terms.map((item) => item.id)).toEqual([t1, t2])
      const list = (await (await send(base(), organizer)).json()) as OrganizerPost[]
      expect(list.map((item) => item.id)).toEqual([second.id, first.id])
      expect(list[1].terms.map((item) => item.id)).toEqual([t1])
    })

    it.each([
      ["an empty title", { title: "  " }],
      ["a title over 120 characters", { title: "x".repeat(121) }],
      ["an empty text", { body: "" }],
      ["a text over 5000 characters", { body: "x".repeat(5001) }],
      ["a missing title", { title: undefined }],
    ])("refuses %s", async (_name, patch) => {
      const response = await send(base(), organizer, "POST", draft(patch))
      expect(response.status).toBe(400)
      expect(await prisma.eventPost.count()).toBe(0)
    })

    it.each([
      ["no term", () => []],
      ["a term of another event", () => [t1, otherEventTerm]],
      ["a cancelled term", () => [t1, cancelledTerm]],
    ])("refuses %s with BOARD_POST_TERM_INVALID", async (_name, termIds) => {
      const response = await send(base(), organizer, "POST", draft({ termIds: termIds() }))
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ code: "BOARD_POST_TERM_INVALID" })
      expect(await prisma.eventPost.count()).toBe(0)
    })

    it("edits the texts and the terms", async () => {
      const post = await publish()

      const response = await send(`${base()}/${post.id}`, organizer, "PUT", {
        title: "Nový nadpis",
        body: "Nový text",
        termIds: [t2],
      })

      expect(response.status).toBe(200)
      const edited = (await (await send(`${base()}/${post.id}`, organizer)).json()) as OrganizerPost
      expect(edited).toMatchObject({ title: "Nový nadpis", body: "Nový text" })
      expect(edited.terms.map((item) => item.id)).toEqual([t2])
    })

    it("refuses an edit with a cancelled term and keeps the post as it was", async () => {
      const post = await publish()
      const response = await send(
        `${base()}/${post.id}`,
        organizer,
        "PUT",
        draft({ termIds: [cancelledTerm] }),
      )
      expect(response.status).toBe(400)
      expect((await prisma.eventPost.findUniqueOrThrow({ where: { id: post.id } })).title).toBe(
        post.title,
      )
    })

    it("answers a missing post with 404 BOARD_POST_NOT_FOUND", async () => {
      for (const [method, path] of [
        ["GET", `${base()}/missing`],
        ["PUT", `${base()}/missing`],
        ["DELETE", `${base()}/missing`],
      ]) {
        const response = await send(path, organizer, method, method === "PUT" ? draft() : undefined)
        expect(response.status).toBe(404)
        expect(await response.json()).toMatchObject({ code: "BOARD_POST_NOT_FOUND" })
      }
    })

    it("deletes a post with its reads and notifications", async () => {
      await apply(participantId, t1, "CONFIRMED")
      const post = await publish()
      await send(`/participant/board/posts/${post.id}/read`, participant, "POST")
      expect(await prisma.eventPostRead.count()).toBe(1)
      expect(await prisma.notification.count()).toBe(1)

      expect((await send(`${base()}/${post.id}`, organizer, "DELETE")).status).toBe(204)

      expect(await prisma.eventPost.count()).toBe(0)
      expect(await prisma.eventPostRead.count()).toBe(0)
      expect(await prisma.eventPostTerm.count()).toBe(0)
      expect(await prisma.notification.count()).toBe(0)
      expect(await board()).toEqual([])
    })
  })

  describe("the notification", () => {
    it("goes to every account confirmed or waitlisted in a chosen term, once", async () => {
      const older = await apply(participantId, t1, "CONFIRMED")
      const newer = await apply(participantId, t2, "WAITLISTED")
      const otherId = (
        await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik2@example.com" } })
      ).id
      await apply(otherId, t1, "TO_EVALUATE")
      await apply(null, t1, "CONFIRMED")

      await publish()

      const mine = await bell()
      expect(mine).toHaveLength(1)
      expect(mine[0]).toMatchObject({
        kind: "BOARD_POST_PUBLISHED",
        readAt: null,
        applicationId: newer,
      })
      expect(mine[0].applicationId).not.toBe(older)
      expect(await bell(otherParticipant)).toEqual([])
      expect(await prisma.notification.count()).toBe(1)
      expect(await bellCount()).toBe(1)
    })

    it("is not made for a cancelled application or one of a term outside the choice", async () => {
      await apply(participantId, t1, "CANCELLED")
      await apply(participantId, t2, "CONFIRMED")

      await publish({ termIds: [t1] })

      expect(await bell()).toEqual([])
    })

    it("is not made again by an edit, and nobody's read is lost", async () => {
      await apply(participantId, t1, "CONFIRMED")
      const post = await publish()
      await send(`/participant/board/posts/${post.id}/read`, participant, "POST")

      await send(`${base()}/${post.id}`, organizer, "PUT", draft({ title: "Změněno" }))

      expect(await prisma.notification.count()).toBe(1)
      const [item] = await board()
      expect(item).toMatchObject({ title: "Změněno", isNew: false })
    })

    it("disappears from the bell when the account no longer sees the post", async () => {
      const id = await apply(participantId, t1, "CONFIRMED")
      await publish({ termIds: [t1] })
      expect(await bell()).toHaveLength(1)

      await prisma.applicationTerm.updateMany({
        where: { applicationId: id },
        data: { status: "CANCELLED" },
      })

      expect(await bell()).toEqual([])
      expect(await bellCount()).toBe(0)
    })
  })

  describe("the participant's board", () => {
    it("shows the posts of the terms the account is confirmed or waitlisted in, newest first", async () => {
      await apply(participantId, t1, "CONFIRMED")
      await apply(participantId, t2, "WAITLISTED")
      await apply(participantId, otherEventTerm, "CANCELLED")
      const first = await publish({ title: "První", termIds: [t1] })
      const second = await publish({ title: "Druhý", body: "x".repeat(300) })
      await publish({ title: "Cizí akce", termIds: [t1] })
      await prisma.eventPost.update({
        where: { id: first.id },
        data: { createdAt: new Date(Date.now() - 60_000) },
      })

      const posts = await board()

      expect(posts.map((item) => item.title)).toEqual(["Cizí akce", "Druhý", "První"])
      expect(posts[1]).toMatchObject({
        id: second.id,
        eventName: "US-91 event",
        isNew: true,
        terms: [{ id: t1 }, { id: t2 }],
      })
      expect(posts[1].excerpt.length).toBeLessThan(200)
      expect(posts[1].excerpt.endsWith("…")).toBe(true)
      expect(posts[1].body).toBeUndefined()
    })

    it("does not show a post to a term to evaluate, a cancelled application or another account", async () => {
      await apply(participantId, t1, "TO_EVALUATE")
      await apply(participantId, t2, "CANCELLED")
      await publish()

      expect(await board()).toEqual([])
      expect(await board(otherParticipant)).toEqual([])
    })

    it("shows only the terms of the post the account is in", async () => {
      await apply(participantId, t2, "CONFIRMED")
      await publish()

      const [post] = await board()

      expect(post.terms.map((item) => item.id)).toEqual([t2])
    })

    it("keeps a debt from hiding a post", async () => {
      const id = await apply(participantId, t1, "CONFIRMED", true)
      await prisma.applicationTerm.updateMany({
        where: { applicationId: id },
        data: { paymentPeriodStartedAt: new Date("2020-01-01") },
      })
      await publish()

      expect(await board()).toHaveLength(1)
    })

    it("opens a post with its whole text, and 404 for one the account does not see", async () => {
      await apply(participantId, t1, "CONFIRMED")
      const post = await publish()

      const response = await send(`/participant/board/posts/${post.id}`, participant)
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ id: post.id, body: "Sraz v 9:00\nu nádraží" })

      const foreign = await send(`/participant/board/posts/${post.id}`, otherParticipant)
      expect(foreign.status).toBe(404)
      expect(await foreign.json()).toMatchObject({ code: "BOARD_POST_NOT_FOUND" })
      expect(
        (await send(`/participant/board/posts/${post.id}/read`, otherParticipant, "POST")).status,
      ).toBe(404)
    })

    it("counts the new posts and drops them when opened, in the bell too, however often", async () => {
      await apply(participantId, t1, "CONFIRMED")
      const first = await publish({ title: "První" })
      const second = await publish({ title: "Druhý" })
      expect(await summary()).toEqual({ unreadCount: 2, latest: { id: second.id, title: "Druhý" } })
      expect(await bellCount()).toBe(2)

      const read = () => send(`/participant/board/posts/${first.id}/read`, participant, "POST")
      expect((await read()).status).toBe(204)
      expect((await read()).status).toBe(204)

      expect((await summary()).unreadCount).toBe(1)
      expect((await board()).find((item) => item.id === first.id)?.isNew).toBe(false)
      expect(await bellCount()).toBe(1)
      expect(await prisma.eventPostRead.count()).toBe(1)
    })

    it("reads a post once for an account with two applications in its terms", async () => {
      await apply(participantId, t1, "CONFIRMED")
      await apply(participantId, t1, "WAITLISTED")
      const post = await publish()
      expect(await board()).toHaveLength(1)

      await send(`/participant/board/posts/${post.id}/read`, participant, "POST")

      expect((await summary()).unreadCount).toBe(0)
    })

    it("has an empty summary without posts", async () => {
      expect(await summary()).toEqual({ unreadCount: 0, latest: null })
    })
  })
})
