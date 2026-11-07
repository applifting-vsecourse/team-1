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

  it("starts with no options and refuses blank or repeated names", async () => {
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

  it("lets the participant tick offered options and write allergies", async () => {
    const own = await (await request("GET", ownPath(), participant)).json()
    expect(own.options).toHaveLength(2)
    expect(own).toMatchObject({ selectedOptionIds: [], allergies: null })

    const [first] = own.options as Option[]
    const saved = await request("PUT", ownPath(), participant, {
      optionIds: [first!.id],
      allergies: "  Peanuts ",
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toMatchObject({
      selectedOptionIds: [first!.id],
      allergies: "Peanuts",
    })
  })

  it("refuses an unknown option and someone else's application", async () => {
    expect(
      (await request("PUT", ownPath(), participant, { optionIds: ["nope"], allergies: "" })).status,
    ).toBe(400)
    const stranger = await signIn("ucastnik2@example.com", "password5")
    expect((await request("GET", ownPath(), stranger)).status).toBe(403)
    expect(
      (await request("PUT", ownPath(), stranger, { optionIds: [], allergies: "x" })).status,
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
    }
  })

  it("drops the ticks of a removed option", async () => {
    await saveOptions([])
    const own = await (await request("GET", ownPath(), participant)).json()
    expect(own).toMatchObject({ options: [], selectedOptionIds: [], allergies: "Peanuts" })
  })
})
