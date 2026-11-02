import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed } from "@/test/integration/test-api"

type CatalogBody = {
  organizations: { id: string; name: string }[]
  events: {
    publicToken: string
    name: string
    organizationName: string
    termCount: number
    fromPriceCzk: number | null
    isOpenForApplications: boolean
  }[]
}

describe("public catalog (integration)", () => {
  let prisma: PrismaService

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  const unpublish = (publicToken: string) =>
    prisma.event.update({ where: { publicToken }, data: { publishedInCatalog: false } })

  it("lists only published events, without a session", async () => {
    const response = await fetch(api("/public/catalog"))

    expect(response.status).toBe(200)
    const body = (await response.json()) as CatalogBody
    const names = body.events.map((event) => event.name)
    expect(names).toContain("Letní kemp 2027 – demo")
    expect(names).not.toContain("Zimní výjezd 2028")
    const published = await prisma.event.count({ where: { publishedInCatalog: true } })
    expect(body.events).toHaveLength(published)
  })

  it("lists only organizations that have a published event", async () => {
    const body = (await (await fetch(api("/public/catalog"))).json()) as CatalogBody

    const withEvents = new Set(body.events.map((event) => event.organizationName))
    expect(body.organizations.map((organization) => organization.name).sort()).toEqual(
      [...withEvents].sort(),
    )
    expect(body.organizations.map((organization) => organization.name)).toContain(
      "Letní kemp z. s.",
    )
  })

  it("summarizes the terms of an event on its card", async () => {
    const body = (await (await fetch(api("/public/catalog"))).json()) as CatalogBody

    expect(body.events.find((event) => event.name === "Letní kemp 2027 – demo")).toMatchObject({
      publicToken: "demo-letni-kemp-plny",
      organizationName: "Letní kemp z. s.",
      termCount: 2,
      fromPriceCzk: 4500,
      terms: [
        { name: "1. týden", startsOn: "2027-07-04", endsOn: "2027-07-10" },
        { name: "2. týden", startsOn: "2027-07-11", endsOn: "2027-07-17" },
      ],
      isOpenForApplications: true,
    })
  })

  it("exposes nothing sensitive in the list or on the event page", async () => {
    const list = await (await fetch(api("/public/catalog"))).text()
    const detail = await (await fetch(api("/public/catalog/events/demo-letni-kemp-plny"))).text()

    for (const text of [list, detail]) {
      expect(text).not.toContain("bankAccount")
      expect(text).not.toContain("2900123456")
      expect(text).not.toContain("evaluationMode")
    }
    expect(Object.keys(JSON.parse(detail)).sort()).toEqual([
      "contactEmail",
      "contactPhone",
      "description",
      "hasPhoto",
      "isOpenForApplications",
      "location",
      "name",
      "organizationName",
      "publicToken",
      "terms",
    ])
  })

  it("opens the page of a published event with its contact", async () => {
    const response = await fetch(api("/public/catalog/events/demo-letni-kemp-plny"))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      name: "Letní kemp 2027 – demo",
      organizationName: "Letní kemp z. s.",
      contactEmail: "kemp@example.com",
      hasPhoto: true,
      isOpenForApplications: true,
    })
  })

  it("answers a not published event and its photo with 404 and no content", async () => {
    const detail = await fetch(api("/public/catalog/events/demo-zimni-vyjezd-2028"))
    const photo = await fetch(api("/public/catalog/events/demo-zimni-vyjezd-2028/photo"))

    expect(detail.status).toBe(404)
    expect(photo.status).toBe(404)
    expect(await detail.text()).not.toContain("Zimní výjezd")
  })

  it("answers an unknown event with 404", async () => {
    const response = await fetch(api("/public/catalog/events/does-not-exist"))

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ statusCode: 404, code: "NOT_FOUND" })
  })

  it("serves the photo of a published event with cache headers, and 304 for a known ETag", async () => {
    const response = await fetch(api("/public/catalog/events/demo-letni-kemp-plny/photo"))

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("image/png")
    expect(response.headers.get("cache-control")).toContain("max-age")
    const etag = response.headers.get("etag")
    expect(etag).toBeTruthy()

    const again = await fetch(api("/public/catalog/events/demo-letni-kemp-plny/photo"), {
      headers: { "If-None-Match": etag ?? "" },
    })
    expect(again.status).toBe(304)
  })

  it("lists an event without a working link, but without the application offer", async () => {
    const organization = await prisma.organization.findFirstOrThrow({
      where: { name: "Letní kemp z. s." },
    })
    await prisma.event.create({
      data: {
        organizationId: organization.id,
        name: "Bez pokojů",
        publicToken: "catalog-bez-pokoju",
        publishedInCatalog: true,
        terms: {
          create: {
            organizationId: organization.id,
            number: 1,
            name: "Termín",
            startsOn: new Date("2027-05-01"),
            endsOn: new Date("2027-05-03"),
            priceCzk: 1000,
          },
        },
      },
    })

    const list = (await (await fetch(api("/public/catalog"))).json()) as CatalogBody
    const detail = (await (
      await fetch(api("/public/catalog/events/catalog-bez-pokoju"))
    ).json()) as { isOpenForApplications: boolean }

    expect(list.events.find((event) => event.name === "Bez pokojů")?.isOpenForApplications).toBe(
      false,
    )
    expect(detail.isOpenForApplications).toBe(false)
  })

  it("drops an organization from the catalog once none of its events is published", async () => {
    await unpublish("demo-letni-kemp-plny")
    const body = (await (await fetch(api("/public/catalog"))).json()) as CatalogBody

    expect(body.events.map((event) => event.name)).not.toContain("Letní kemp 2027 – demo")
    const detail = await fetch(api("/public/catalog/events/demo-letni-kemp-plny"))
    expect(detail.status).toBe(404)
  })
})
