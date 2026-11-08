import {
  ApplicationTransport,
  EventTransport,
  isDepartureWithinTerm,
  OWN_TRANSPORT_ID,
  TransportInput,
  TransportParticipants,
} from "@/modules/transport/domain/transport"
import { TransportRepository } from "@/modules/transport/repositories/transport.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class TransportService {
  constructor(
    private readonly repository: TransportRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  private async scope(user: Identity, eventId: string) {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return { eventId, organizationId }
  }

  /** A transport lives in an active term and leaves no later than the term ends. */
  private assertFits(term: { endsOn: string; isCancelled: boolean }, input: TransportInput) {
    if (term.isCancelled) throw new AppException(HttpStatus.BAD_REQUEST, "TERM_CANCELLED")
    if (!isDepartureWithinTerm(input.departureAt, term.endsOn)) {
      throw new AppException(HttpStatus.BAD_REQUEST, "TRANSPORT_AFTER_TERM_END", undefined, {
        endsOn: term.endsOn,
      })
    }
  }

  async list(user: Identity, eventId: string): Promise<EventTransport> {
    return this.repository.list(await this.scope(user, eventId))
  }

  async create(
    user: Identity,
    eventId: string,
    termId: string,
    input: TransportInput,
  ): Promise<void> {
    const scope = await this.scope(user, eventId)
    const term = await this.repository.findTerm(scope, termId)
    if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    this.assertFits(term, input)
    await this.repository.create(scope, termId, input)
  }

  async update(user: Identity, eventId: string, id: string, input: TransportInput): Promise<void> {
    const scope = await this.scope(user, eventId)
    const term = await this.repository.termOfTransport(scope, id)
    if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    this.assertFits(term, input)
    await this.repository.update(scope, id, input)
  }

  async remove(user: Identity, eventId: string, id: string): Promise<void> {
    const scope = await this.scope(user, eventId)
    if (!(await this.repository.termOfTransport(scope, id))) {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    }
    await this.repository.remove(scope, id)
  }

  async participants(
    user: Identity,
    eventId: string,
    transportId: string,
    termId?: string,
  ): Promise<TransportParticipants> {
    const scope = await this.scope(user, eventId)
    if (transportId !== OWN_TRANSPORT_ID) {
      return this.repository.participants(scope, transportId, "")
    }
    if (!termId) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    return this.repository.participants(scope, null, termId)
  }

  /** Someone else's application and a missing one look the same: 403 with no content. */
  async ofApplication(user: Identity, applicationId: string): Promise<ApplicationTransport> {
    const result = await this.repository.ofApplication(user.id, applicationId)
    if (!result) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your application")
    return result
  }

  async choose(
    user: Identity,
    applicationId: string,
    termId: string,
    transportId: string | null,
  ): Promise<void> {
    const id = transportId === OWN_TRANSPORT_ID ? null : transportId
    if (!(await this.repository.choose(user.id, applicationId, termId, id))) {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    }
  }
}
