import { Account } from "@/modules/account/domain/account"
import { AccountRepository } from "@/modules/account/repositories/account.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { Injectable } from "@nestjs/common"

@Injectable()
export class AccountService {
  constructor(private readonly accountRepository: AccountRepository) {}

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
