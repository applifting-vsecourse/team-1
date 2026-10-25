import { DEFAULT_LOCALE, Locale } from "@/core/email/locale"
import { ParticipantAccountsRepository } from "@/modules/participants/repositories/participant-accounts.repository"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

export type EnsureAccountInput = {
  email: string
  name: string
  /** Language of the application; becomes the account's e-mail language. */
  locale?: Locale
}

export type EnsureAccountResult = {
  /** Participant account the application is attached to. */
  userId: string
  /** True when the account was created now. */
  isNew: boolean
  /**
   * The participant has no password yet — the e-mail must carry a magic link.
   * False: the account has its own password, the e-mail links to the sign-in.
   */
  mustSetPassword: boolean
}

/**
 * Contract between stream B (application) and stream C (accounts). B calls
 * `ensureAccount` when an application is submitted: it finds or creates the
 * PARTICIPANT account of the e-mail (docs/PROJEKT.md, section 10) and refuses
 * an organizer's or admin's e-mail — one e-mail is one account type.
 *
 * It runs on its own connection, outside B's evaluation transaction: call it
 * before that transaction starts.
 */
@Injectable()
export class ParticipantAccountsService {
  constructor(private readonly accounts: ParticipantAccountsRepository) {}

  async ensureAccount(input: EnsureAccountInput): Promise<EnsureAccountResult> {
    const email = input.email.trim().toLowerCase()

    const existing = await this.accounts.findByEmail(email)
    if (existing) return this.fromExisting(existing)

    const created = await this.accounts.createParticipant({
      email,
      name: input.name.trim(),
      locale: input.locale ?? DEFAULT_LOCALE,
    })
    if (created) {
      return { userId: created.id, isNew: true, mustSetPassword: true }
    }

    // Another application with the same new e-mail won the race.
    const winner = await this.accounts.findByEmail(email)
    if (!winner) throw new Error("Participant account vanished after a race")
    return this.fromExisting(winner)
  }

  private fromExisting(account: {
    id: string
    accountType: string
    mustSetPassword: boolean
  }): EnsureAccountResult {
    // The same answer as any invalid input: the public form must not reveal that
    // the e-mail belongs to an organizer (docs/PROJEKT.md, decision 2026-10-25).
    if (account.accountType !== "PARTICIPANT") {
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    }
    return {
      userId: account.id,
      isNew: false,
      mustSetPassword: account.mustSetPassword,
    }
  }
}
