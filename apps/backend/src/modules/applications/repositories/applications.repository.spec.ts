import { PrismaService } from "@/core/prisma/prisma.service"
import { evaluateManualSubmission } from "@/modules/applications/domain/manual-submission"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus } from "@nestjs/common"
import { ApplicationsRepository, ApplicationToSave } from "./applications.repository"

describe("ApplicationsRepository deferred account creation", () => {
  const setup = () => {
    const tx = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "t1" }]),
      applicationTerm: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ termId: "t1", application: { gender: "FEMALE" } }]),
      },
      room: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ termId: "t1", capacity: 1, extraBeds: 0, gender: "FEMALE" }]),
      },
      application: { create: jest.fn().mockResolvedValue({ id: "a1", number: 1 }) },
    }
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown): unknown => fn(tx) }
    const resolveUserId = jest.fn().mockResolvedValue("u1")
    const application: ApplicationToSave = {
      firstName: "Eva",
      lastName: "Novak",
      birthDate: "2000-05-15",
      gender: "FEMALE",
      email: "eva@example.com",
      phone: "+420777123456",
      locale: "en",
      consentAt: new Date(),
      accessToken: "token",
      termIds: ["t1"],
      userId: resolveUserId,
    }
    return {
      repository: new ApplicationsRepository(prisma as unknown as PrismaService),
      tx,
      application,
      resolveUserId,
    }
  }

  it("rejects current occupancy under the database lock before creating an account", async () => {
    const { repository, tx, application, resolveUserId } = setup()
    await expect(
      repository.saveEvaluated({ id: "e1", organizationId: "o1" }, [application], (snapshot) => {
        expect(tx.$queryRaw).toHaveBeenCalledTimes(2)
        const result = evaluateManualSubmission(
          [{ termId: "t1", status: "CONFIRMED", priceCzk: 1000 }],
          "FEMALE",
          snapshot,
        )
        if (result.overCapacity.length) {
          throw new AppException(HttpStatus.CONFLICT, "CAPACITY_EXCEEDED")
        }
        return [result.terms]
      }),
    ).rejects.toMatchObject({ status: 409 })
    expect(resolveUserId).not.toHaveBeenCalled()
    expect(tx.application.create).not.toHaveBeenCalled()
  })

  it("connects the deferred account when a waitlisted application is accepted", async () => {
    const { repository, tx, application, resolveUserId } = setup()
    await repository.saveEvaluated({ id: "e1", organizationId: "o1" }, [application], () => [
      [{ termId: "t1", status: "WAITLISTED", priceCzk: 1000 }],
    ])
    expect(resolveUserId).toHaveBeenCalledTimes(1)
    expect(tx.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ user: { connect: { id: "u1" } } }),
      }),
    )
  })
})
