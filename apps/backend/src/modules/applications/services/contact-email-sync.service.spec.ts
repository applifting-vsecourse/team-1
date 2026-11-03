import { ApplicationsRepository } from "@/modules/applications/repositories/applications.repository"
import { emailChangeHooks } from "@/shared/auth/email-change/email-change-hooks"
import { mock } from "jest-mock-extended"
import { ContactEmailSyncService } from "./contact-email-sync.service"

describe("ContactEmailSyncService", () => {
  it("moves the contact e-mail of the account's applications when its e-mail is verified", async () => {
    const repository = mock<ApplicationsRepository>()
    new ContactEmailSyncService(repository).onModuleInit()

    await emailChangeHooks.publish({ id: "u1", email: "eva.nova@example.cz" })

    expect(repository.updateContactEmail).toHaveBeenCalledWith("u1", "eva.nova@example.cz")
  })
})
