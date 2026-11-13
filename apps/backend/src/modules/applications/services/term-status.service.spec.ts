import { StatusChangeResult } from "@/modules/applications/domain/term-status"
import {
  SubstituteApplication,
  SubstitutesRepository,
  SubstituteTermState,
} from "@/modules/applications/repositories/substitutes.repository"
import { TermStatusRepository } from "@/modules/applications/repositories/term-status.repository"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { ApplicationConfirmationMailer } from "@/modules/participants/services/application-confirmation-mailer.service"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { ForbiddenException, HttpStatus, Logger } from "@nestjs/common"

const result = (
  to: StatusChangeResult["to"],
  from: StatusChangeResult["from"] = "WAITLISTED",
): StatusChangeResult => ({
  from,
  to,
  email: "petra@example.com",
  locale: "cs",
  eventName: "Kemp",
  organizationName: "Alpine Collective",
  bankAccount: "2900123456/2010",
  termName: "T1",
  gender: "FEMALE",
  application: {
    number: 1,
    firstName: "Jana",
    lastName: "Nováková",
    accessToken: "token",
    terms: [{ name: "T1", termNumber: 1, status: to, priceCzk: 1000 }],
  },
})

describe("TermStatusService", () => {
  const user = { id: "u1", accountType: "ORGANIZER" } as Identity
  let repository: { changeStatus: jest.Mock }
  let substitutes: { findTermStateById: jest.Mock }
  let access: { assertCanAccessApplication: jest.Mock }
  let mailer: { sendApplicationChange: jest.Mock }
  let service: TermStatusService

  beforeEach(() => {
    repository = { changeStatus: jest.fn() }
    substitutes = { findTermStateById: jest.fn().mockResolvedValue(null) }
    access = { assertCanAccessApplication: jest.fn().mockResolvedValue({ organizationId: "org" }) }
    mailer = { sendApplicationChange: jest.fn().mockResolvedValue(undefined) }
    service = new TermStatusService(
      repository as unknown as TermStatusRepository,
      substitutes as unknown as SubstitutesRepository,
      access as unknown as OrganizationAccessService,
      mailer as unknown as ApplicationConfirmationMailer,
    )
  })

  it("takes the acting user from the session and the organization from the application", async () => {
    repository.changeStatus.mockResolvedValue(result("CONFIRMED"))

    await service.changeByOrganizer(user, "a1", "t1", "CONFIRMED", true)

    expect(repository.changeStatus).toHaveBeenCalledWith(
      {
        organizationId: "org",
        applicationId: "a1",
        termId: "t1",
        to: "CONFIRMED",
        actorId: "u1",
        isOverCapacityConfirmed: true,
      },
      expect.any(Function),
    )
  })

  it("e-mails the applicant with payment details after a confirmation", async () => {
    repository.changeStatus.mockResolvedValue(result("CONFIRMED"))

    await service.changeByOrganizer(user, "a1", "t1", "CONFIRMED", false)

    expect(mailer.sendApplicationChange).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "CONFIRMED_FROM_WAITLIST",
        isAmountChanged: true,
        email: "petra@example.com",
      }),
    )
  })

  it.each([
    ["no. 2", "TO_EVALUATE", "CONFIRMED", "CONFIRMED", true],
    ["no. 3", "TO_EVALUATE", "WAITLISTED", "WAITLISTED", false],
    ["no. 4", "TO_EVALUATE", "CANCELLED", "REJECTED", false],
    ["no. 5", "WAITLISTED", "CONFIRMED", "CONFIRMED_FROM_WAITLIST", true],
    ["no. 10", "CONFIRMED", "CANCELLED", "REJECTED", false],
    ["no. 13", "CONFIRMED", "WAITLISTED", "WAITLISTED_AFTER_CONFIRMED", false],
    ["no. 14", "WAITLISTED", "CANCELLED", "CANCELLED_BY_ORGANIZER", false],
  ] as const)(
    "EMAILY.md %s: an organizer's change %s → %s e-mails kind %s",
    async (_row, from, to, kind, isAmountChanged) => {
      repository.changeStatus.mockResolvedValue(result(to, from))

      await service.changeByOrganizer(user, "a1", "t1", to, false)

      expect(mailer.sendApplicationChange).toHaveBeenCalledTimes(1)
      expect(mailer.sendApplicationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          kind,
          isAmountChanged,
          organizationName: "Alpine Collective",
          termName: "T1",
          gender: "FEMALE",
        }),
      )
    },
  )

  it("sends no e-mail and changes nothing for a foreign application", async () => {
    access.assertCanAccessApplication.mockRejectedValue(new ForbiddenException())

    await expect(service.changeByOrganizer(user, "a1", "t1", "CONFIRMED", false)).rejects.toThrow(
      ForbiddenException,
    )
    expect(repository.changeStatus).not.toHaveBeenCalled()
    expect(mailer.sendApplicationChange).not.toHaveBeenCalled()
  })

  it("rejects with a 409 code the domain decides, and sends no e-mail", async () => {
    repository.changeStatus.mockImplementation(
      (_command: unknown, decide: (snapshot: unknown) => void) => {
        decide({ status: "CANCELLED", gender: "FEMALE", rooms: [], confirmedGenders: [] })
        return Promise.resolve(result("WAITLISTED"))
      },
    )

    await expect(
      service.changeByOrganizer(user, "a1", "t1", "WAITLISTED", false),
    ).rejects.toMatchObject({
      status: 409,
      code: "INVALID_STATUS_TRANSITION",
    })
    expect(mailer.sendApplicationChange).not.toHaveBeenCalled()
  })

  it("answers 404 when the term of the application is not found", async () => {
    repository.changeStatus.mockResolvedValue(null)

    await expect(
      service.changeByOrganizer(user, "a1", "t1", "CANCELLED", false),
    ).rejects.toMatchObject({
      status: 404,
    })
  })

  it("lets the system change a status with no actor", async () => {
    repository.changeStatus.mockResolvedValue(result("CANCELLED"))

    await service.applyChange({
      organizationId: "org",
      applicationId: "a1",
      termId: "t1",
      to: "CANCELLED",
      actorId: null,
      isOverCapacityConfirmed: false,
    })

    expect(repository.changeStatus).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: null }),
      expect.any(Function),
    )
  })

  it("sends e-mail no. 6 without payment details when the system cancels a waitlisted application", async () => {
    repository.changeStatus.mockResolvedValue(result("CANCELLED"))
    const command = {
      organizationId: "org",
      applicationId: "a1",
      termId: "t1",
      to: "CANCELLED" as const,
      isOverCapacityConfirmed: false,
    }

    await service.applyChange({ ...command, actorId: null })
    await service.applyChange({ ...command, actorId: "u1" })

    expect(mailer.sendApplicationChange).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ kind: "NO_BED_FREED", isAmountChanged: false, locale: "cs" }),
    )
    expect(mailer.sendApplicationChange).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ kind: "CANCELLED_BY_ORGANIZER" }),
    )
  })
})

describe("TermStatusService.fillFreedBeds (US-31)", () => {
  const waiting = (id: string, gender: "FEMALE" | "MALE", minute: number): SubstituteApplication =>
    ({
      applicationId: id,
      termId: "t1",
      roomMode: "GENDERED",
      gender,
      status: "WAITLISTED",
      submittedAt: new Date(Date.UTC(2027, 2, 10, 9, minute)),
      number: minute + 1,
    }) as SubstituteApplication
  const state = (overrides: Partial<SubstituteTermState> = {}): SubstituteTermState => ({
    termId: "t1",
    name: null,
    organizationId: "org",
    eventId: "e1",
    isCancelled: false,
    startsOn: new Date("2099-07-01"),
    endsOn: new Date("2099-07-08"),
    evaluationMode: "AUTOMATIC",
    roomMode: "GENDERED",
    rooms: [{ capacity: 2, extraBeds: 0, gender: "MALE" }],
    confirmedGenders: ["MALE"],
    waitlisted: [waiting("petr", "MALE", 1), waiting("adam", "MALE", 0)],
    ...overrides,
  })
  let repository: { changeStatus: jest.Mock }
  let substitutes: { findTermStateById: jest.Mock }
  let mailer: { sendApplicationChange: jest.Mock }
  let service: TermStatusService

  beforeEach(() => {
    repository = { changeStatus: jest.fn().mockResolvedValue(result("CONFIRMED")) }
    substitutes = { findTermStateById: jest.fn() }
    mailer = { sendApplicationChange: jest.fn().mockResolvedValue(undefined) }
    service = new TermStatusService(
      repository as unknown as TermStatusRepository,
      substitutes as unknown as SubstitutesRepository,
      {} as unknown as OrganizationAccessService,
      mailer as unknown as ApplicationConfirmationMailer,
    )
  })

  const male = { termId: "t1", gender: "MALE" } as const
  const female = { termId: "t1", gender: "FEMALE" } as const
  const confirmedIds = (): string[] =>
    repository.changeStatus.mock.calls.map(([command]) => command.applicationId)

  it("confirms the first substitute in order of receipt as the system and e-mails them", async () => {
    substitutes.findTermStateById.mockResolvedValueOnce(state())

    await service.fillFreedBeds([male])

    expect(repository.changeStatus).toHaveBeenCalledTimes(1)
    expect(repository.changeStatus).toHaveBeenCalledWith(
      {
        organizationId: "org",
        applicationId: "adam",
        termId: "t1",
        to: "CONFIRMED",
        actorId: null,
        isOverCapacityConfirmed: false,
      },
      expect.any(Function),
    )
    expect(mailer.sendApplicationChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "CONFIRMED_FROM_WAITLIST", isAmountChanged: true }),
    )
  })

  it("confirms one substitute per freed bed, however many beds are free", async () => {
    // Two beds are free in the term, but the action freed one: the other was free before.
    substitutes.findTermStateById.mockResolvedValue(state({ confirmedGenders: [] }))

    await service.fillFreedBeds([male])

    expect(confirmedIds()).toEqual(["adam"])
  })

  it("confirms two substitutes for two freed beds, one round each", async () => {
    substitutes.findTermStateById
      .mockResolvedValueOnce(state({ confirmedGenders: [] }))
      .mockResolvedValueOnce(
        state({ confirmedGenders: ["MALE"], waitlisted: [waiting("petr", "MALE", 1)] }),
      )

    await service.fillFreedBeds([male, male])

    expect(confirmedIds()).toEqual(["adam", "petr"])
  })

  it("fills a freed bed only from its own bed group", async () => {
    // A free women's bed that was added earlier is not taken when a man leaves.
    substitutes.findTermStateById.mockResolvedValue(
      state({
        rooms: [
          { capacity: 1, extraBeds: 0, gender: "MALE" },
          { capacity: 1, extraBeds: 0, gender: "FEMALE" },
        ],
        confirmedGenders: [],
        waitlisted: [waiting("jana", "FEMALE", 0), waiting("adam", "MALE", 1)],
      }),
    )

    await service.fillFreedBeds([male])
    expect(confirmedIds()).toEqual(["adam"])

    repository.changeStatus.mockClear()
    await service.fillFreedBeds([female])
    expect(confirmedIds()).toEqual(["jana"])
  })

  it("does not give the bed back to the one that has just been moved to the waitlist", async () => {
    substitutes.findTermStateById.mockResolvedValueOnce(state({ confirmedGenders: [] }))

    await service.fillFreedBeds([male], { except: "adam" })

    expect(confirmedIds()).toEqual(["petr"])
  })

  it("leaves the proposal to the organizer in the manual mode", async () => {
    substitutes.findTermStateById.mockResolvedValue(state({ evaluationMode: "MANUAL" }))

    await service.fillFreedBeds([male])

    expect(repository.changeStatus).not.toHaveBeenCalled()
  })

  it("confirms nobody once the term has started, the waitlist is cancelled then (D-064)", async () => {
    substitutes.findTermStateById.mockResolvedValue(state({ startsOn: new Date("2020-07-01") }))

    await service.fillFreedBeds([male])

    expect(repository.changeStatus).not.toHaveBeenCalled()
  })

  it("confirms nobody into a cancelled term or when the bed is gone", async () => {
    substitutes.findTermStateById.mockResolvedValueOnce(state({ isCancelled: true }))
    await service.fillFreedBeds([male])
    substitutes.findTermStateById.mockResolvedValueOnce(
      state({ confirmedGenders: ["MALE", "MALE"] }),
    )
    await service.fillFreedBeds([male])

    expect(repository.changeStatus).not.toHaveBeenCalled()
  })

  it("tries the next substitute when the first is no longer waiting, and never fails the caller", async () => {
    substitutes.findTermStateById.mockResolvedValue(state({ confirmedGenders: [] }))
    repository.changeStatus
      .mockRejectedValueOnce(new AppException(HttpStatus.CONFLICT, "INVALID_STATUS_TRANSITION"))
      .mockResolvedValueOnce(result("CONFIRMED"))

    await expect(service.fillFreedBeds([male])).resolves.toBeUndefined()

    expect(repository.changeStatus).toHaveBeenCalledTimes(2)
    expect(mailer.sendApplicationChange).toHaveBeenCalledTimes(1)
  })

  it("reads the state again when the bed was taken meanwhile and confirms nobody", async () => {
    substitutes.findTermStateById
      .mockResolvedValueOnce(state())
      .mockResolvedValueOnce(state({ confirmedGenders: ["MALE", "MALE"] }))
    repository.changeStatus.mockRejectedValueOnce(
      new AppException(HttpStatus.CONFLICT, "CAPACITY_EXCEEDED"),
    )

    await expect(service.fillFreedBeds([male])).resolves.toBeUndefined()

    expect(repository.changeStatus).toHaveBeenCalledTimes(1)
    expect(mailer.sendApplicationChange).not.toHaveBeenCalled()
  })

  it("logs an unexpected failure instead of throwing it", async () => {
    substitutes.findTermStateById.mockRejectedValue(new Error("db down"))
    const logged = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)

    await expect(service.fillFreedBeds([male, male])).resolves.toBeUndefined()

    expect(logged).toHaveBeenCalledTimes(2)
    logged.mockRestore()
  })
})
