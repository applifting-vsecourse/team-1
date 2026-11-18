import { TermStatusService } from "@/modules/applications/services/term-status.service"
import {
  EventTerm,
  isValidTermPeriod,
  sortTerms,
  TermInput,
} from "@/modules/events/domain/event-term"
import { TermsRepository } from "@/modules/events/repositories/terms.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class TermsService {
  constructor(
    private readonly repository: TermsRepository,
    private readonly organizationAccess: OrganizationAccessService,
    private readonly termStatus: TermStatusService,
  ) {}

  /** Active terms by date first, then the cancelled ones by date. */
  async list(user: Identity, eventId: string): Promise<EventTerm[]> {
    await this.organizationAccess.assertCanAccessEvent(user, eventId)
    const terms = await this.repository.findByEvent(eventId)
    return [
      ...sortTerms(terms.filter((term) => !term.cancelledAt)),
      ...sortTerms(terms.filter((term) => term.cancelledAt)),
    ]
  }

  async create(user: Identity, eventId: string, input: TermInput): Promise<EventTerm> {
    const { organizationId } = await this.organizationAccess.assertCanAccessEvent(user, eventId)
    return this.repository.create(organizationId, eventId, this.validated(input))
  }

  async update(
    user: Identity,
    eventId: string,
    termId: string,
    input: TermInput,
  ): Promise<EventTerm> {
    await this.activeTerm(user, eventId, termId)
    return this.repository.update(termId, this.validated(input))
  }

  /** US-131: cancels the term and the applications in it; returns the term and their count. */
  async cancel(
    user: Identity,
    eventId: string,
    termId: string,
    reason: string,
  ): Promise<{ term: EventTerm; cancelledApplications: number }> {
    const trimmed = reason.trim()
    if (!trimmed) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    await this.activeTerm(user, eventId, termId)
    const cancelledApplications = await this.termStatus.cancelTerm(user, eventId, termId, trimmed)
    const term = await this.repository.findById(termId)
    return { term: term!, cancelledApplications }
  }

  private validated(input: TermInput): TermInput {
    // Blank is no name: stored as null, never as an empty string (D-053).
    const name = input.name?.trim() || null
    if (!isValidTermPeriod(input.startsOn, input.endsOn)) {
      throw new AppException(HttpStatus.BAD_REQUEST, "TERM_END_BEFORE_START")
    }
    return { ...input, name }
  }

  /** The term of this event (any other id is the same 403 as a foreign one) that isn't cancelled. */
  private async activeTerm(user: Identity, eventId: string, termId: string): Promise<EventTerm> {
    await this.organizationAccess.assertCanAccessEvent(user, eventId)
    const term = await this.repository.findById(termId)
    if (!term || term.eventId !== eventId) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    if (term.cancelledAt) throw new AppException(HttpStatus.CONFLICT, "TERM_CANCELLED")
    return term
  }
}
