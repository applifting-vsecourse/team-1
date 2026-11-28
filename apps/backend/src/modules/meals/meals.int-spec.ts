// US-64: the organizer defines meal restrictions, the participant ticks them, the kitchen gets counts per term.
import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type Option = { id: string; name: string }
type KitchenTerm = {
  termId: string
  total: number
  regular: number
  options: (Option & { count: number })[]
  allergies: { firstName: string; lastName: string; allergies: string }[]
  specialRequests: { lastName: string; specialRequest: string }[]
}

describe("meals (integration)", () => {
  let prisma: PrismaService
  let organizer: string
  let otherOrganizer: string
  let participant: string
  let eventId: string
  let applicationId: string

  const request = (method: string, path: string, cookie?: string, body?: unknown) =>
    fetch(api(path), {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  const optionsPath = () => `/organizer/events/${eventId}/meals/options`
  const ownPath = () => `/participant/applications/${applicationId}/meals`
  const saveOptions = (options: { id?: string; name: string }[], cookie = organizer) =>
    request("PUT", optionsPath(), cookie, { options })
  const summary = async (): Promise<KitchenTerm[]> =>
    (await request("GET", `/organizer/events/${eventId}/meals/summary`, organizer)).json()

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    organizer = await signIn("organizator@example.com", "password1")
    otherOrganizer = await signIn("organizator2@example.com", "password2")
    participant = await signIn("ucastnik@example.com", "password4")
    const event = await prisma.event.findUniqueOrThrow({
      where: { publicToken: "demo-letni-kemp-2027" },
    })
    eventId = event.id
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
    applicationId = (
      await prisma.application.findFirstOrThrow({ where: { eventId, userId: user.id } })
    ).id
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("requires the right account type and organization", async () => {
    expect((await request("GET", optionsPath())).status).toBe(401)
    expect((await request("GET", optionsPath(), participant)).status).toBe(403)
    expect((await request("GET", optionsPath(), otherOrganizer)).status).toBe(403)
    expect((await saveOptions([{ name: "Vegan" }], otherOrganizer)).status).toBe(403)
    expect(
      (await request("GET", `/organizer/events/${eventId}/meals/summary`, otherOrganizer)).status,
    ).toBe(403)
    expect((await request("GET", ownPath(), organizer)).status).toBe(403)
  })

  it("requires the roster term to belong to the requested event", async () => {
    const term = await prisma.term.findFirstOrThrow({ where: { eventId, cancelledAt: null } })
    const created = await request("POST", "/organizer/events", organizer, { name: "Another camp" })
    expect(created.status).toBe(201)
    const otherEvent = (await created.json()) as { id: string }
    const roster = (event: string, id: string) =>
      `/organizer/events/${event}/meals/terms/${id}/participants`
    expect((await request("GET", roster(otherEvent.id, term.id), organizer)).status).toBe(403)
    expect((await request("GET", roster(eventId, "missing"), organizer)).status).toBe(403)
    expect((await request("GET", roster(eventId, term.id), otherOrganizer)).status).toBe(403)
  })

  it("offers vegetarian and gluten-free in a newly created event", async () => {
    const created = await request("POST", "/organizer/events", organizer, { name: "Winter camp" })
    expect(created.status).toBe(201)
    const { id } = (await created.json()) as { id: string }
    const options = await request("GET", `/organizer/events/${id}/meals/options`, organizer)
    expect(((await options.json()) as Option[]).map((option) => option.name)).toEqual([
      "Vegetariánská",
      "Bezlepková",
    ])
  })

  it("starts with no options in a seeded event and refuses blank or repeated names", async () => {
    expect(await (await request("GET", optionsPath(), organizer)).json()).toEqual([])
    expect((await saveOptions([{ name: "  " }])).status).toBe(400)
    expect((await saveOptions([{ name: "Vegan" }, { name: "vegan" }])).status).toBe(400)
  })

  it("lets the organizer define, rename, reorder and remove options", async () => {
    const created = (await (
      await saveOptions([{ name: "Vegetarian" }, { name: "Gluten-free" }, { name: "Vegan" }])
    ).json()) as Option[]
    expect(created.map((option) => option.name)).toEqual(["Vegetarian", "Gluten-free", "Vegan"])

    const [vegetarian, glutenFree] = created
    const updated = (await (
      await saveOptions([
        { id: glutenFree!.id, name: "No gluten" },
        { id: vegetarian!.id, name: "Vegetarian" },
      ])
    ).json()) as Option[]
    expect(updated).toEqual([
      { id: glutenFree!.id, name: "No gluten" },
      { id: vegetarian!.id, name: "Vegetarian" },
    ])
  })

  it("lets the participant tick offered options and write allergies and a special request", async () => {
    const own = await (await request("GET", ownPath(), participant)).json()
    expect(own.options).toHaveLength(2)
    expect(own).toMatchObject({ selectedOptionIds: [], allergies: null, specialRequest: null })

    const [first] = own.options as Option[]
    const saved = await request("PUT", ownPath(), participant, {
      optionIds: [first!.id],
      allergies: "  Peanuts ",
      specialRequest: " Early dinner ",
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      selectedOptionIds: [first!.id],
      allergies: "Peanuts",
      specialRequest: "Early dinner",
    })
  })

  it("confirms having no restriction, shows it to the organizer and cancels it on a later entry", async () => {
    const decided = async (): Promise<boolean> =>
      (
        await (
          await request("GET", `/participant/applications/${applicationId}`, participant)
        ).json()
      ).mealsDecided
    const own = await (await request("GET", ownPath(), participant)).json()
    const [first] = own.options as Option[]
    const clear = { optionIds: [], allergies: "", specialRequest: "" }

    await request("PUT", ownPath(), participant, clear)
    expect(await decided()).toBe(false)

    const confirmed = await request("PUT", ownPath(), participant, {
      ...clear,
      noRestrictions: true,
    })
    expect(confirmed.status).toBe(200)
    expect(await confirmed.json()).toMatchObject({ noRestrictions: true })
    expect(await decided()).toBe(true)

    const contradiction = await request("PUT", ownPath(), participant, {
      ...clear,
      allergies: "Peanuts",
      noRestrictions: true,
    })
    expect(contradiction.status).toBe(400)

    const later = await request("PUT", ownPath(), participant, { ...clear, optionIds: [first!.id] })
    expect(await later.json()).toMatchObject({ noRestrictions: false })
    expect(await decided()).toBe(true)
    // Put back what the other tests expect.
    await request("PUT", ownPath(), participant, {
      optionIds: own.selectedOptionIds,
      allergies: own.allergies ?? "",
      specialRequest: own.specialRequest ?? "",
    })
  })

  it("refuses an unknown option and someone else's application", async () => {
    expect(
      (
        await request("PUT", ownPath(), participant, {
          optionIds: ["nope"],
          allergies: "",
          specialRequest: "",
        })
      ).status,
    ).toBe(400)
    const stranger = await signIn("ucastnik2@example.com", "password5")
    expect((await request("GET", ownPath(), stranger)).status).toBe(403)
    expect(
      (
        await request("PUT", ownPath(), stranger, {
          optionIds: [],
          allergies: "x",
          specialRequest: "",
        })
      ).status,
    ).toBe(403)
  })

  it("counts confirmed participants per term for the kitchen", async () => {
    const terms = await summary()
    expect(terms.length).toBeGreaterThan(0)
    const confirmed = await prisma.applicationTerm.count({
      where: { status: "CONFIRMED", application: { eventId } },
    })
    expect(terms.reduce((sum, term) => sum + term.total, 0)).toBe(confirmed)
    const withJana = terms.filter((term) =>
      term.allergies.some((entry) => entry.lastName === "Nováková"),
    )
    expect(withJana.length).toBeGreaterThan(0)
    for (const term of withJana) {
      expect(term.regular).toBe(term.total - 1)
      expect(term.options.find((option) => option.name === "No gluten")?.count).toBe(1)
      expect(term.options.find((option) => option.name === "Vegetarian")?.count).toBe(0)
      expect(term.allergies).toContainEqual(
        expect.objectContaining({ lastName: "Nováková", allergies: "Peanuts" }),
      )
      expect(term.specialRequests).toContainEqual(
        expect.objectContaining({ lastName: "Nováková", specialRequest: "Early dinner" }),
      )
    }
  })

  it("saves organizer changes for the application and all its confirmed kitchen terms", async () => {
    const path = `/organizer/events/${eventId}/meals/applications/${applicationId}`
    const original = await (await request("GET", path, organizer)).json()
    expect(original).toMatchObject({ editable: true, applicationId })
    const empty = { optionIds: [], allergies: "", specialRequest: "", noRestrictions: true }
    expect((await request("PUT", path, participant, empty)).status).toBe(403)
    expect((await request("PUT", path, otherOrganizer, empty)).status).toBe(403)
    expect(
      (await request("PUT", path, organizer, { ...empty, optionIds: ["unknown"] })).status,
    ).toBe(400)
    try {
      const before = await summary()
      const response = await request("PUT", path, organizer, empty)
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        noRestrictions: true,
        selectedOptionIds: [],
        allergies: null,
        specialRequest: null,
      })
      expect(await (await request("GET", ownPath(), participant)).json()).toMatchObject({
        noRestrictions: true,
      })
      const after = await summary()
      const confirmed = await prisma.applicationTerm.findMany({
        where: { applicationId, status: "CONFIRMED", term: { cancelledAt: null } },
      })
      expect(confirmed.length).toBeGreaterThan(0)
      for (const { termId } of confirmed) {
        const term = after.find((item) => item.termId === termId)!
        expect(term.regular).toBe(before.find((item) => item.termId === termId)!.regular + 1)
        const roster = await request(
          "GET",
          `/organizer/events/${eventId}/meals/terms/${termId}/participants`,
          organizer,
        )
        expect(await roster.json()).toContainEqual(
          expect.objectContaining({ applicationId, noRestrictions: true }),
        )
      }
    } finally {
      await request("PUT", path, organizer, {
        optionIds: original.selectedOptionIds,
        allergies: original.allergies ?? "",
        specialRequest: original.specialRequest ?? "",
        noRestrictions: original.noRestrictions,
      })
    }
  })

  it("refuses organizer meal access to an application of another event", async () => {
    const created = await request("POST", "/organizer/events", organizer, { name: "Third camp" })
    const otherEvent = (await created.json()) as { id: string }
    const path = `/organizer/events/${otherEvent.id}/meals/applications/${applicationId}`
    const empty = { optionIds: [], allergies: "", specialRequest: "", noRestrictions: true }
    expect((await request("GET", path, organizer)).status).toBe(403)
    expect((await request("PUT", path, organizer, empty)).status).toBe(403)
  })

  it("refuses organizer meal changes of an application that is no longer editable", async () => {
    const path = `/organizer/events/${eventId}/meals/applications/${applicationId}`
    const terms = await prisma.applicationTerm.findMany({ where: { applicationId } })
    const empty = { optionIds: [], allergies: "", specialRequest: "", noRestrictions: true }
    await prisma.applicationTerm.updateMany({
      where: { applicationId },
      data: { status: "CANCELLED" },
    })
    try {
      expect(await (await request("GET", path, organizer)).json()).toMatchObject({
        editable: false,
      })
      const response = await request("PUT", path, organizer, empty)
      expect(response.status).toBe(409)
      expect(await response.json()).toMatchObject({ code: "MEALS_EDIT_CLOSED" })
    } finally {
      for (const term of terms) {
        await prisma.applicationTerm.update({
          where: { id: term.id },
          data: { status: term.status },
        })
      }
    }
  })

  it("drops the ticks of a removed option", async () => {
    await saveOptions([])
    const own = await (await request("GET", ownPath(), participant)).json()
    expect(own).toMatchObject({ options: [], selectedOptionIds: [], allergies: "Peanuts" })
  })
})
