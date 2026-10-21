import { Locale } from "@/core/email/locale"
import {
  NewApplication,
  SavedApplication,
} from "@/modules/applications/domain/application-submission"
import { isOpenForApplications } from "@/modules/applications/domain/public-event"
import { evaluateSubmission, isValidBirthDate } from "@/modules/applications/domain/submission"
import { ApplicationsRepository } from "@/modules/applications/repositories/applications.repository"
import { ApplicationConfirmationMailer } from "@/modules/participants/services/application-confirmation-mailer.service"
import { ParticipantAccountsService } from "@/modules/participants/services/participant-accounts.service"
import { Gender } from "@/shared/domain/gender"
import { AppException } from "@/shared/errors/app.exception"
import { generateToken } from "@/shared/utils/token"
import { HttpStatus, Injectable, Logger } from "@nestjs/common"

export type SubmitApplicationInput = {
  email: string
  participants: {
    firstName: string
    lastName: string
    birthDate: string
    gender: Gender
    termIds: string[]
  }[]
}

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name)

  constructor(
    private readonly repository: ApplicationsRepository,
    private readonly accounts: ParticipantAccountsService,
    private readonly mailer: ApplicationConfirmationMailer,
  ) {}

  /**
   * Stores one application per participant and evaluates every selected term
   * (US-27). The application is saved even when the term is full — then the
   * participant is waitlisted in it.
   */
  async submit(
    publicToken: string,
    input: SubmitApplicationInput,
    locale: Locale,
  ): Promise<SavedApplication[]> {
    const event = await this.repository.findEventForSubmission(publicToken)
    if (
      !event ||
      !isOpenForApplications({ termCount: event.terms.length, roomCount: event.roomCount })
    ) {
      throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
    }

    const priceByTerm = new Map(event.terms.map((term) => [term.id, term.priceCzk]))
    for (const participant of input.participants) {
      const knownTerms = participant.termIds.every((termId) => priceByTerm.has(termId))
      if (!knownTerms || !isValidBirthDate(participant.birthDate)) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }
    }

    // Own connection, so it runs before the evaluation transaction starts.
    const first = input.participants[0]
    const account = await this.accounts.ensureAccount({
      email: input.email,
      name: `${first.firstName} ${first.lastName}`,
      locale,
    })

    const consentAt = new Date()
    const email = input.email.trim().toLowerCase()
    const applications: NewApplication[] = input.participants.map((participant) => ({
      ...participant,
      email,
      locale,
      userId: account.userId,
      consentAt,
      accessToken: generateToken(),
    }))

    const saved = await this.repository.saveEvaluated(event, applications, (snapshot) =>
      evaluateSubmission(
        applications.map((application) => ({
          gender: application.gender,
          terms: application.termIds.map((termId) => ({
            termId,
            priceCzk: priceByTerm.get(termId) as number,
          })),
        })),
        snapshot,
      ),
    )

    await this.sendConfirmation(event, email, locale, account.mustSetPassword, applications, saved)
    return saved
  }

  /**
   * ONE summary e-mail for the whole submission, however many participants it
   * holds (PO decision 2026-10-21, docs/PROJEKT.md §10). The mailer logs a
   * failed delivery itself; the catch keeps a stored application a success
   * whatever happens.
   */
  private async sendConfirmation(
    event: { name: string; bankAccount: string; terms: { id: string; name: string }[] },
    email: string,
    locale: Locale,
    mustSetPassword: boolean,
    submitted: NewApplication[],
    saved: SavedApplication[],
  ): Promise<void> {
    const termNames = new Map(event.terms.map((term) => [term.id, term.name]))
    const lastNames = new Map(submitted.map((a) => [a.accessToken, a.lastName]))
    try {
      await this.mailer.sendSubmissionConfirmation({
        email,
        locale,
        eventName: event.name,
        bankAccount: event.bankAccount,
        mustSetPassword,
        applications: saved.map((application) => ({
          number: application.number,
          firstName: application.firstName,
          lastName: lastNames.get(application.accessToken) ?? "",
          accessToken: application.accessToken,
          terms: application.terms.map((term) => ({
            name: termNames.get(term.termId) ?? "",
            status: term.status,
            priceCzk: term.priceCzk,
          })),
        })),
      })
    } catch (error) {
      // The application is stored; a failed e-mail must not turn it into an error.
      this.logger.error("Confirmation e-mail of a submission failed", error)
    }
  }
}
