import { ApplicationsRepository } from "@/modules/applications/repositories/applications.repository"
import { emailChangeHooks } from "@/shared/auth/email-change/email-change-hooks"
import { Injectable, OnModuleInit } from "@nestjs/common"

/**
 * US-125 (PO, #218): after an account changes its sign-in e-mail everything goes to the
 * new address, so the contact e-mail of the account's applications follows it. Only the
 * applications that still hold another address are touched, so a plain verification
 * changes nothing.
 */
@Injectable()
export class ContactEmailSyncService implements OnModuleInit {
  constructor(private readonly repository: ApplicationsRepository) {}

  onModuleInit(): void {
    emailChangeHooks.onVerified((user) => this.repository.updateContactEmail(user.id, user.email))
  }
}
