// #515: an organizer edits the details of an application (D-141); the applicant is not e-mailed (D-104).
import { PrismaService } from "@/core/prisma/prisma.service"
import {
  allEmailsTo,
  api,
  connectTestPrisma,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

describe("organizer edit of an application (integration)", () => {
  let prisma: PrismaService
  let organizerCookie: string
  let foreignCookie: string
  let participantCookie: string
  let applicationId: string
  let applicantEmail: string
  let organizationId: string
  let organizerId: string
  let mailsBefore: number

  const edit = (id: string, cookie?: string, body?: unknown): Promise<Response> =>
    fetch(api(`/organizer/applications/${id}/details`), {
      method: "PUT",
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    })
  const get = (path: string, cookie = organizerCookie) =>
    fetch(api(path), { headers: { Cookie: cookie } })

  const input = {
    firstName: "Jana",
    lastName: "Nováková",
    birthDate: "2000-05-15",
    phone: "+420 777 123 456",
    individualAccommodation: true,
    accommodationRequest: "Prosím o pokoj v přízemí.",
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    await fetch(api("/health")).catch(() => fetch(api("/health")))
    organizerCookie = await signIn("organizator@example.com", "password1")
    foreignCookie = await signIn("organizator2@example.com", "password2")
    participantCookie = await signIn("ucastnik@example.com", "password4")
    const application = await prisma.application.findFirstOrThrow({
      where: { email: "ucastnik@example.com", event: { name: "Letní kemp 2027" } },
    })
    applicationId = application.id
    applicantEmail = application.email
    organizationId = application.organizationId
    mailsBefore = allEmailsTo(applicantEmail).length
    organizerId = (
      await prisma.user.findUniqueOrThrow({ where: { email: "organizator@example.com" } })
    ).id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("is only for an organizer of the application's organization", async () => {
    expect((await edit(applicationId)).status).toBe(401)
    expect((await edit(applicationId, participantCookie, input)).status).toBe(403)
    const foreign = await edit(applicationId, foreignCookie, input)
    expect(foreign.status).toBe(403)
    expect(await foreign.text()).not.toContain("Jana")
    expect((await edit("does-not-exist", organizerCookie, input)).status).toBe(403)
    expect(await prisma.applicationEdit.count({ where: { applicationId } })).toBe(0)
  })

  it("shows the phone and whether the application is editable in the detail", async () => {
    const detail = await get(`/organizer/applications/${applicationId}/payments`)
    expect(detail.status).toBe(200)
    expect(await detail.json()).toMatchObject({ phone: null, isEditable: true })
  })

  it("validates before writing", async () => {
    for (const invalid of [
      { ...input, firstName: "  " },
      { ...input, birthDate: "2027-02-30" },
      { ...input, accommodationRequest: "x".repeat(2001) },
      { ...input, email: "novy@example.com" },
      { ...input, gender: "MALE" },
    ]) {
      expect((await edit(applicationId, organizerCookie, invalid)).status).toBe(400)
    }
    const phone = await edit(applicationId, organizerCookie, { ...input, phone: "abc" })
    expect(phone.status).toBe(400)
    expect(await phone.json()).toMatchObject({ code: "INVALID_PHONE" })
    expect(await prisma.applicationEdit.count({ where: { applicationId } })).toBe(0)
  })

  it("saves the details, keeps gender and e-mail, and writes the history with the organizer", async () => {
    const before = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } })
    const response = await edit(applicationId, organizerCookie, input)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      firstName: "Jana",
      phone: "+420777123456",
      individualAccommodation: true,
      history: [{ authorName: "Olga Organizátorová" }],
    })

    const after = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } })
    expect(after).toMatchObject({
      phone: "+420777123456",
      individualAccommodation: true,
      accommodationRequest: input.accommodationRequest,
      gender: before.gender,
      email: before.email,
    })
    const record = await prisma.applicationEdit.findFirstOrThrow({ where: { applicationId } })
    expect(record).toMatchObject({
      changedById: organizerId,
      authorName: "Olga Organizátorová",
      organizationId,
    })
    expect(record.changedFields).toEqual([
      "birthDate",
      "phone",
      "individualAccommodation",
      "accommodationRequest",
    ])

    const detail = await get(`/organizer/applications/${applicationId}/payments`)
    expect(await detail.json()).toMatchObject({ phone: "+420777123456" })
  })

  it("shows the change in the history of the application, with the organizer", async () => {
    const response = await get(`/organizer/applications/${applicationId}/history`)
    expect(response.status).toBe(200)
    const entries = (await response.json()) as { kind: string; author: string; changes?: unknown }[]
    expect(entries[0]).toMatchObject({
      kind: "EDIT",
      author: "Olga Organizátorová",
      changes: [
        { field: "birthDate", to: "2000-05-15" },
        { field: "phone", from: null, to: "+420777123456" },
        { field: "individualAccommodation", from: "false", to: "true" },
        { field: "accommodationRequest", from: null, to: input.accommodationRequest },
      ],
    })
  })

  it("does not e-mail the applicant", async () => {
    // The server prints an e-mail after it has answered; give the log time to catch up.
    await new Promise((wait) => setTimeout(wait, 500))
    expect(allEmailsTo(applicantEmail)).toHaveLength(mailsBefore)
  })

  it("notifies the other organizers of the organization but not the author", async () => {
    const notices = await prisma.notification.findMany({
      where: { applicationId, kind: "APPLICATION_EDITED_BY_ORGANIZER" },
    })
    const members = await prisma.organizationMember.findMany({
      where: { organizationId, user: { accountType: "ORGANIZER" } },
    })
    expect(members.some((member) => member.userId === organizerId)).toBe(true)
    expect(notices.map((notice) => notice.userId).sort()).toEqual(
      members
        .map((member) => member.userId)
        .filter((id) => id !== organizerId)
        .sort(),
    )
    expect(notices.every((notice) => notice.type === "REQUEST")).toBe(true)
  })

  it("writes nothing for a save that changes nothing", async () => {
    const response = await edit(applicationId, organizerCookie, input)
    expect(response.status).toBe(200)
    expect(await prisma.applicationEdit.count({ where: { applicationId } })).toBe(1)
  })

  it("rejects a duplicate identity on a live term", async () => {
    const own = await prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { terms: true },
    })
    const term = own.terms.find((item) => item.status !== "CANCELLED")!
    await prisma.application.create({
      data: {
        organizationId,
        eventId: own.eventId,
        accessToken: `dup-515-${Date.now()}`,
        firstName: "Květoslav",
        lastName: "Zkouška",
        birthDate: new Date("1999-06-20T00:00:00.000Z"),
        gender: own.gender,
        email: "duplicate-515@example.com",
        consentAt: new Date(),
        terms: {
          create: {
            organizationId,
            termId: term.termId,
            status: "WAITLISTED",
            priceCzk: term.priceCzk,
          },
        },
      },
    })
    const response = await edit(applicationId, organizerCookie, {
      ...input,
      firstName: "kvetoslav",
      lastName: "Zkouska",
      birthDate: "1999-06-20",
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "APPLICATION_DUPLICATE" })
    expect(await prisma.applicationEdit.count({ where: { applicationId } })).toBe(1)
  })

  it("does not edit an application without a live term", async () => {
    const terms = await prisma.applicationTerm.findMany({
      where: { applicationId },
      include: { term: true },
    })
    const edits = await prisma.applicationEdit.count({ where: { applicationId } })
    const attempt = { ...input, firstName: "Zrušená" }

    try {
      await prisma.applicationTerm.updateMany({
        where: { applicationId },
        data: { status: "CANCELLED" },
      })
      const cancelled = await edit(applicationId, organizerCookie, attempt)
      expect(cancelled.status).toBe(409)
      expect(await cancelled.json()).toMatchObject({ code: "APPLICATION_NOT_EDITABLE" })
      const detail = await get(`/organizer/applications/${applicationId}/payments`)
      expect(await detail.json()).toMatchObject({ isEditable: false })
    } finally {
      for (const term of terms) {
        await prisma.applicationTerm.update({
          where: { id: term.id },
          data: { status: term.status },
        })
      }
    }

    try {
      for (const { term } of terms) {
        await prisma.term.update({
          where: { id: term.id },
          data: { startsOn: new Date("2020-07-01"), endsOn: new Date("2020-07-08") },
        })
      }
      const over = await edit(applicationId, organizerCookie, attempt)
      expect(over.status).toBe(409)
      expect(await over.json()).toMatchObject({ code: "APPLICATION_NOT_EDITABLE" })
      const detail = await get(`/organizer/applications/${applicationId}/payments`)
      expect(await detail.json()).toMatchObject({ isEditable: false })
    } finally {
      for (const { term } of terms) {
        await prisma.term.update({
          where: { id: term.id },
          data: { startsOn: term.startsOn, endsOn: term.endsOn },
        })
      }
    }

    expect(await prisma.applicationEdit.count({ where: { applicationId } })).toBe(edits)
    expect(
      (await prisma.application.findUniqueOrThrow({ where: { id: applicationId } })).firstName,
    ).not.toBe("Zrušená")
  })

  it.each([
    ["an empty string", ""],
    ["blanks", "   "],
    ["null", null],
    ["a missing field", undefined],
  ])(
    "saves %s as no phone (it is optional) and records the removal in the history",
    async (_name, phone) => {
      await edit(applicationId, organizerCookie, { ...input, phone: "+420 777 123 456" })
      const before = await prisma.applicationEdit.count({ where: { applicationId } })

      const response = await edit(applicationId, organizerCookie, { ...input, phone })
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ phone: null })
      expect(
        (await prisma.application.findUniqueOrThrow({ where: { id: applicationId } })).phone,
      ).toBeNull()
      expect(await prisma.applicationEdit.count({ where: { applicationId } })).toBe(before + 1)
      const record = await prisma.applicationEdit.findFirstOrThrow({
        where: { applicationId },
        orderBy: { createdAt: "desc" },
      })
      expect(record.changedFields).toEqual(["phone"])
      expect(record.after).toMatchObject({ phone: null })
    },
  )
})
