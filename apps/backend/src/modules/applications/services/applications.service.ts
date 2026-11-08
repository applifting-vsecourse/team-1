import { Locale } from "@/core/email/locale"
import {
  NewApplication,
  SavedApplication,
} from "@/modules/applications/domain/application-submission"
import { evaluateManualSubmission } from "@/modules/applications/domain/manual-submission"
import { isOpenForApplications } from "@/modules/applications/domain/public-event"
import { evaluateSubmission, isValidBirthDate } from "@/modules/applications/domain/submission"
import { hasEndedTerm } from "@/modules/applications/domain/term-ended"
import { termLabel } from "@/modules/applications/domain/term-label"
import { todayInPrague } from "@/modules/applications/domain/waitlist-expiry"
import {
  ApplicationsRepository,
  ApplicationToSave,
} from "@/modules/applications/repositories/applications.repository"
import { ApplicationConfirmationMailer } from "@/modules/participants/services/application-confirmation-mailer.service"
import { ParticipantAccountsService } from "@/modules/participants/services/participant-accounts.service"
import { Identity } from "@/shared/auth/domain/identity"
import { Gender } from "@/shared/domain/gender"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { KeyedMutex } from "@/shared/utils/keyed-mutex"
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

export type ManualApplicationInput = {
  email: string
  phone: string
  consent: true
  firstName: string
  lastName: string
  birthDate: string
  gender: Gender
  terms: { termId: string; status: "CONFIRMED" | "WAITLISTED" }[]
  confirmOverCapacity?: boolean
}

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name)
  private readonly eventLocks = new KeyedMutex()

  constructor(
    private readonly repository: ApplicationsRepository,
    private readonly accounts: ParticipantAccountsService,
    private readonly mailer: ApplicationConfirmationMailer,
    private readonly access: OrganizationAccessService,
  ) {}

  /** Manual creation shares duplicate checks, transaction locks, account setup and e-mail with public submission. */
  async submitByOrganizer(
    user: Identity,
    eventId: string,
    input: ManualApplicationInput,
    locale: Locale,
  ): Promise<SavedApplication> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const event = await this.repository.findEventForOrganizer(eventId, organizationId)
    if (
      !event ||
      !isOpenForApplications({
        termCount: event.terms.length,
        termsWithoutRooms: event.termsWithoutRooms,
      })
    ) {
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    }
    const prices = new Map(event.terms.map(({ id, priceCzk }) => [id, priceCzk]))
    const requestedIds = input.terms.map(({ termId }) => termId)
    if (
      !isValidBirthDate(input.birthDate) ||
      requestedIds.length === 0 ||
      new Set(requestedIds).size !== requestedIds.length ||
      requestedIds.some((id) => !prices.has(id))
    ) {
      throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    }
    // A term that is over takes no applications, not even from the organizer; checked before the
    // account is created and the confirmation e-mail goes out.
    const today = todayInPrague(new Date()).toISOString().slice(0, 10)
    if (hasEndedTerm(event.terms, requestedIds, today)) {
      throw new AppException(HttpStatus.CONFLICT, "TERM_ENDED")
    }
    const participant = {
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: input.birthDate,
      termIds: requestedIds,
    }
    const email = input.email.trim().toLowerCase()
    const { mustSetPassword, submitted, saved } = await this.eventLocks.run(event.id, async () => {
      await this.repository.assertNoDuplicate(event.id, [participant], locale)
      let mustSetPassword = false
      const submitted: ApplicationToSave = {
        ...participant,
        gender: input.gender,
        email,
        phone: input.phone.trim(),
        locale,
        userId: async () => {
          // Called only after capacity and duplicate validation under the database lock.
          const account = await this.accounts.ensureAccount({
            email,
            name: `${input.firstName} ${input.lastName}`,
            locale,
          })
          mustSetPassword = account.mustSetPassword
          return account.userId
        },
        consentAt: new Date(),
        accessToken: generateToken(),
      }
      const saved = await this.repository.saveEvaluated(
        event,
        [submitted],
        (snapshot) => {
          const result = evaluateManualSubmission(
            input.terms.map(({ termId, status }) => ({
              termId,
              status,
              priceCzk: prices.get(termId) as number,
            })),
            input.gender,
            snapshot,
          )
          if (result.overCapacity.length > 0 && input.confirmOverCapacity !== true) {
            throw new AppException(HttpStatus.CONFLICT, "CAPACITY_EXCEEDED")
          }
          return [result.terms]
        },
        user.id,
      )
      return { mustSetPassword, submitted, saved: saved[0] }
    })
    await this.sendConfirmation(event, email, locale, mustSetPassword, [submitted], [saved])
    return saved
  }

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
      !isOpenForApplications({
        termCount: event.terms.length,
        termsWithoutRooms: event.termsWithoutRooms,
      })
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

    const email = input.email.trim().toLowerCase()
    // One submission per event at a time: the duplicate check and the account
    // creation below are outside the event lock of `saveEvaluated`, so without
    // this two identical requests with new e-mails would both create an account
    // before one of them is rejected (US-23). Single backend instance only —
    // the check under the event lock stays as the guard for the data itself.
    const { account, applications, saved } = await this.eventLocks.run(event.id, async () => {
      // Before the account is created: a rejected duplicate must leave nothing behind.
      await this.repository.assertNoDuplicate(event.id, input.participants, locale)

      // Own connection, so it runs before the evaluation transaction starts.
      const first = input.participants[0]
      const account = await this.accounts.ensureAccount({
        email: input.email,
        name: `${first.firstName} ${first.lastName}`,
        locale,
      })

      const consentAt = new Date()
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
          event.evaluationMode,
        ),
      )
      return { account, applications, saved }
    })

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
    event: {
      name: string
      bankAccount: string
      terms: { id: string; name: string | null; startsOn: string; endsOn: string; number: number }[]
    },
    email: string,
    locale: Locale,
    mustSetPassword: boolean,
    submitted: Pick<NewApplication, "accessToken" | "lastName">[],
    saved: SavedApplication[],
  ): Promise<void> {
    const termsById = new Map(event.terms.map((term) => [term.id, term]))
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
          terms: application.terms.map((term) => {
            const eventTerm = termsById.get(term.termId)
            // A missing term must not fall back to number 0 (= the summary variable symbol).
            if (!eventTerm) throw new Error(`Term ${term.termId} is missing in the event`)
            return {
              name: termLabel(eventTerm, locale),
              termNumber: eventTerm.number,
              status: term.status,
              priceCzk: term.priceCzk,
            }
          }),
        })),
      })
    } catch (error) {
      // The application is stored; a failed e-mail must not turn it into an error.
      this.logger.error("Confirmation e-mail of a submission failed", error)
    }
  }
}
