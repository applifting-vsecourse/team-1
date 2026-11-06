import { PrismaService } from "@/core/prisma/prisma.service"
import { NotificationsRepository } from "@/modules/notifications/repositories/notifications.repository"
import { TermStatusRepository } from "./term-status.repository"

type Locale = "en" | "cs"

/** Just enough of the transaction for `changeStatus`; the queries are what D-078 is about. */
const setup = (options: {
  applicationLocale: Locale
  /** null: the application has no account. */
  user: { locale: Locale } | null
  firstApplicationLocale?: Locale
}): { repository: TermStatusRepository; findFirstApplication: jest.Mock } => {
  const findFirstApplication = jest.fn((args: { where: { id?: string; userId?: string } }) =>
    Promise.resolve(
      args.where.userId
        ? { locale: options.firstApplicationLocale ?? options.applicationLocale }
        : {
            id: "a1",
            eventId: "e1",
            userId: options.user ? "u1" : null,
            locale: options.applicationLocale,
            email: "petra@example.com",
            number: 7,
            firstName: "Petr",
            lastName: "Novák",
            accessToken: "token",
            gender: "MALE",
            event: {
              name: "Kemp",
              organization: { name: "Alpine Collective", bankAccount: "1/2" },
            },
          },
    ),
  )
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    application: { findFirst: findFirstApplication },
    user: { findUnique: jest.fn().mockResolvedValue(options.user) },
    room: { findMany: jest.fn().mockResolvedValue([]) },
    applicationTerm: {
      findUnique: jest.fn().mockResolvedValue({
        id: "at1",
        status: "CONFIRMED",
        term: { name: null, startsOn: new Date("2027-07-12"), endsOn: new Date("2027-07-18") },
      }),
      findMany: jest
        .fn()
        // the confirmed ones for the capacity check, then the terms of the application
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            termId: "t1",
            status: "WAITLISTED",
            priceCzk: 1000,
            term: {
              name: null,
              number: 1,
              startsOn: new Date("2027-07-12"),
              endsOn: new Date("2027-07-18"),
            },
          },
        ]),
      update: jest.fn().mockResolvedValue({}),
    },
    applicationTermStatusChange: { create: jest.fn().mockResolvedValue({}) },
  }
  const prisma = { $transaction: (fn: (t: typeof tx) => unknown): unknown => fn(tx) }
  return {
    repository: new TermStatusRepository(
      prisma as unknown as PrismaService,
      { create: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationsRepository,
    ),
    findFirstApplication,
  }
}

const command = {
  organizationId: "org",
  applicationId: "a1",
  termId: "t1",
  to: "WAITLISTED" as const,
  actorId: "u1",
  isOverCapacityConfirmed: false,
}

describe("TermStatusRepository.participantChangeOptions: manual evaluation", () => {
  it.each([
    { cancellationStartsOn: null, canChangeImmediately: true, owedCzk: 0 },
    { cancellationStartsOn: new Date("2000-01-01"), canChangeImmediately: false, owedCzk: 2000 },
  ])("projects debt with canChangeImmediately=$canChangeImmediately", async (scenario) => {
    const prisma = {
      application: {
        findFirst: jest.fn().mockResolvedValue({
          gender: "MALE",
          terms: [],
          event: {
            cancellationStartsOn: scenario.cancellationStartsOn,
            evaluationMode: "MANUAL",
            terms: [
              {
                id: "t2",
                name: "Second",
                startsOn: new Date("2027-07-08"),
                endsOn: new Date("2027-07-14"),
                priceCzk: 2000,
                rooms: [{ capacity: 1, gender: "MALE" }],
                applicationTerms: [],
                _count: { rooms: 1 },
              },
            ],
          },
        }),
      },
    }
    const repository = new TermStatusRepository(
      prisma as unknown as PrismaService,
      {} as NotificationsRepository,
    )

    expect(await repository.participantChangeOptions("u1", "a1")).toMatchObject({
      canChangeImmediately: scenario.canChangeImmediately,
      terms: [{ id: "t2", priceCzk: 2000, owedAfterChangeCzk: scenario.owedCzk }],
    })
  })
})

describe("TermStatusRepository.changeStatus: language and names of the e-mail (D-078, US-116)", () => {
  it("uses the preferred language of the user over the language of the application", async () => {
    const { repository } = setup({ applicationLocale: "en", user: { locale: "cs" } })

    const result = await repository.changeStatus(command, () => undefined)

    expect(result?.locale).toBe("cs")
    expect(result?.termName).toBe("12.–18. 7. 2027")
  })

  it("uses the language of the first application of the user when the user set none", async () => {
    const { repository, findFirstApplication } = setup({
      applicationLocale: "en",
      user: { locale: "en" },
      firstApplicationLocale: "cs",
    })

    const result = await repository.changeStatus(command, () => undefined)

    expect(result?.locale).toBe("cs")
    expect(findFirstApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
      }),
    )
  })

  it("uses the language of the application itself when it has no account", async () => {
    const { repository } = setup({ applicationLocale: "cs", user: null })

    const result = await repository.changeStatus(command, () => undefined)

    expect(result?.locale).toBe("cs")
  })

  it("hands over the organization name and labels the term in the language of the e-mail", async () => {
    const { repository } = setup({
      applicationLocale: "cs",
      user: { locale: "en" },
      firstApplicationLocale: "en",
    })

    const result = await repository.changeStatus(command, () => undefined)

    expect(result).toMatchObject({
      locale: "en",
      organizationName: "Alpine Collective",
      termName: "12–18 Jul 2027",
    })
  })
})
