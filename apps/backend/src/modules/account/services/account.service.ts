import { Account, ProfileChange } from "@/modules/account/domain/account"
import { AccountRepository } from "@/modules/account/repositories/account.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { Injectable } from "@nestjs/common"

@Injectable()
export class AccountService {
  constructor(private readonly accountRepository: AccountRepository) {}

  /**
   * Name and preferred language of the signed-in user. `User.locale` is the
   * language of e-mails to the account (reset password, verification, and the
   * application-change e-mails of D-078), so changing it is all it takes for
   * the next e-mail to follow the new language. The user comes from the
   * session, never from the body.
   */
  async updateProfile(user: Identity, change: ProfileChange): Promise<Account> {
    const saved = await this.accountRepository.updateProfile(user.id, change)
    return this.getAccount(
      new Identity(
        user.id,
        user.email,
        saved.name,
        user.accountType,
        user.mustSetPassword,
        saved.locale,
      ),
    )
  }

  async getAccount(user: Identity): Promise<Account> {
    const organizations =
      user.accountType === "ORGANIZER"
        ? await this.accountRepository.findOrganizationsOfMember(user.id)
        : []

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType,
      mustSetPassword: user.mustSetPassword,
      locale: user.locale,
      organizations,
    }
  }
}
