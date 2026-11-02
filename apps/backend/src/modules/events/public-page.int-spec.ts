import { PrismaService } from "@/core/prisma/prisma.service"
import { api, connectTestPrisma, resetAndSeed, signIn } from "@/test/integration/test-api"

type EventBody = {
  id: string
  name: string
  description: string | null
  location: string | null
  contactEmail: string | null
  contactPhone: string | null
  publishedInCatalog: boolean
  photoFileName: string | null
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const FULL_PAGE = {
  name: "Letní kemp Lipno 2027",
  description: "Týden v přírodě, společné zážitky.",
  location: "Lipno nad Vltavou",
  contactEmail: "info@alpine.example",
  contactPhone: "+420 000 000 000",
  publishedInCatalog: true,
}

describe("public page of an event (integration)", () => {
  let prisma: PrismaService
  let cookieA: string
  let cookieB: string
  let eventId: string

  const putPage = (cookie: string, id: string, body: object): Promise<Response> =>
    fetch(api(`/organizer/events/${id}/public-page`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(body),
    })

  const putPhoto = (
    cookie: string,
    id: string,
    body: Buffer,
    contentType = "image/png",
  ): Promise<Response> =>
    fetch(api(`/organizer/events/${id}/photo`), {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "X-File-Name": encodeURIComponent("lipno-2027.png"),
        Cookie: cookie,
      },
      body: new Uint8Array(body),
    })

  const getEvent = async (cookie: string, id: string): Promise<EventBody> =>
    (await (
      await fetch(api(`/organizer/events/${id}`), { headers: { Cookie: cookie } })
    ).json()) as EventBody

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookieA = await signIn("organizator@example.com", "password1")
    cookieB = await signIn("organizator2@example.com", "password2")
  })

  beforeEach(async () => {
    const created = await fetch(api("/organizer/events"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({ name: "Nová akce" }),
    })
    eventId = ((await created.json()) as EventBody).id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("keeps a new event out of the catalog", async () => {
    expect(await getEvent(cookieA, eventId)).toMatchObject({
      publishedInCatalog: false,
      contactEmail: null,
      photoFileName: null,
    })
  })

  it("saves the content and returns it", async () => {
    const response = await putPage(cookieA, eventId, FULL_PAGE)

    expect(response.status).toBe(200)
    expect(await getEvent(cookieA, eventId)).toMatchObject(FULL_PAGE)
  })

  it("saves an incomplete page while it is not in the catalog", async () => {
    const response = await putPage(cookieA, eventId, {
      name: "Jen název",
      publishedInCatalog: false,
    })

    expect(response.status).toBe(200)
    expect(await getEvent(cookieA, eventId)).toMatchObject({
      name: "Jen název",
      description: null,
      publishedInCatalog: false,
    })
  })

  it("refuses the catalog without description, place and contact e-mail", async () => {
    const response = await putPage(cookieA, eventId, {
      ...FULL_PAGE,
      description: "",
      contactEmail: "",
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: "PUBLIC_PAGE_INCOMPLETE" })
    expect((await getEvent(cookieA, eventId)).publishedInCatalog).toBe(false)
  })

  it("has no photo to serve before one is uploaded", async () => {
    const response = await fetch(api(`/organizer/events/${eventId}/photo`), {
      headers: { Cookie: cookieA },
    })

    expect(response.status).toBe(404)
  })

  it("refuses an invalid phone number", async () => {
    expect((await putPage(cookieA, eventId, { ...FULL_PAGE, contactPhone: "abc" })).status).toBe(
      400,
    )
    expect(
      (await putPage(cookieA, eventId, { ...FULL_PAGE, contactPhone: "+420 777 000 001" })).status,
    ).toBe(200)
  })

  it("refuses an invalid e-mail and a missing name", async () => {
    expect((await putPage(cookieA, eventId, { ...FULL_PAGE, contactEmail: "nope" })).status).toBe(
      400,
    )
    expect((await putPage(cookieA, eventId, { ...FULL_PAGE, name: " " })).status).toBe(400)
  })

  it("needs an organizer session and an event of the organizer's organization", async () => {
    expect(
      (await fetch(api(`/organizer/events/${eventId}/public-page`), { method: "PUT" })).status,
    ).toBe(401)

    expect((await putPage(cookieB, eventId, FULL_PAGE)).status).toBe(403)
    expect((await putPhoto(cookieB, eventId, PNG)).status).toBe(403)
    const photo = await fetch(api(`/organizer/events/${eventId}/photo`), {
      headers: { Cookie: cookieB },
    })
    expect(photo.status).toBe(403)
    expect((await getEvent(cookieA, eventId)).publishedInCatalog).toBe(false)
  })

  it("stores a photo", async () => {
    const response = await putPhoto(cookieA, eventId, PNG)

    expect(response.status).toBe(200)
    expect(await getEvent(cookieA, eventId)).toMatchObject({ photoFileName: "lipno-2027.png" })
    const stored = await prisma.eventPhoto.findUniqueOrThrow({ where: { eventId } })
    expect(stored.contentType).toBe("image/png")
    expect(Buffer.from(stored.data)).toEqual(PNG)
    const image = await fetch(api(`/organizer/events/${eventId}/photo`), {
      headers: { Cookie: cookieA },
    })
    expect(image.headers.get("content-type")).toContain("image/png")
    expect(Buffer.from(await image.arrayBuffer())).toEqual(PNG)
  })

  it("removes the photo, and refuses a foreign event", async () => {
    await putPhoto(cookieA, eventId, PNG)
    const remove = (cookie: string) =>
      fetch(api(`/organizer/events/${eventId}/photo`), {
        method: "DELETE",
        headers: { Cookie: cookie },
      })

    expect((await remove(cookieB)).status).toBe(403)
    expect((await getEvent(cookieA, eventId)).photoFileName).toBe("lipno-2027.png")

    expect((await remove(cookieA)).status).toBe(200)
    expect((await getEvent(cookieA, eventId)).photoFileName).toBeNull()
    expect(await prisma.eventPhoto.count({ where: { eventId } })).toBe(0)
  })

  it("rejects a photo of the wrong type, even one sent as an image", async () => {
    const gif = Buffer.from("GIF89a-not-allowed")
    const response = await putPhoto(cookieA, eventId, gif)

    expect(response.status).toBe(415)
    expect(await response.json()).toMatchObject({ code: "PHOTO_INVALID_TYPE" })
    expect((await putPhoto(cookieA, eventId, gif, "image/gif")).status).toBe(415)
    expect((await getEvent(cookieA, eventId)).photoFileName).toBeNull()
  })

  it("rejects a photo over 2 MB", async () => {
    const big = Buffer.alloc(2 * 1024 * 1024 + 1)
    PNG.copy(big)
    const response = await putPhoto(cookieA, eventId, big)

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ code: "PHOTO_TOO_LARGE" })
    expect((await getEvent(cookieA, eventId)).photoFileName).toBeNull()
  })
})
