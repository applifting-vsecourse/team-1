import { StatusChangeResult } from "@/modules/applications/domain/term-status"
import { TermStatusRepository } from "@/modules/applications/repositories/term-status.repository"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { ApplicationConfirmationMailer } from "@/modules/participants/services/application-confirmation-mailer.service"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { ForbiddenException } from "@nestjs/common"

const result = (to: StatusChangeResult["to"]): StatusChangeResult => ({
  from: "WAITLISTED",
  to,
  email: "petra@example.com",
  locale: "cs",
  eventName: "Kemp",
  bankAccount: "2900123456/2010",
  application: {
    number: 1,
    firstName: "Jana",
    lastName: "Nováková",
    accessToken: "token",
    terms: [{ name: "T1", status: to, priceCzk: 1000 }],
  },
})

describe("TermStatusService", () => {
  const user = { id: "u1", accountType: "ORGANIZER" } as Identity
  let repository: { changeStatus: jest.Mock }
  let access: { assertCanAccessApplication: jest.Mock }
  let mailer: { sendApplicationChange: jest.Mock }
  let service: TermStatusService

  beforeEach(() => {
    repository = { changeStatus: jest.fn() }
    access = { assertCanAccessApplication: jest.fn().mockResolvedValue({ organizationId: "org" }) }
    mailer = { sendApplicationChange: jest.fn().mockResolvedValue(undefined) }
    service = new TermStatusService(
      repository as unknown as TermStatusRepository,
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
        kind: "STATUS_CHANGED",
        isAmountChanged: true,
        email: "petra@example.com",
      }),
    )
  })

  it("e-mails a rejection without payment details after a cancellation", async () => {
    repository.changeStatus.mockResolvedValue(result("CANCELLED"))

    await service.changeByOrganizer(user, "a1", "t1", "CANCELLED", false)

    expect(mailer.sendApplicationChange).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "REJECTED", isAmountChanged: false }),
    )
  })

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
      expect.objectContaining({ kind: "REJECTED" }),
    )
  })
})
