import {
  ApplicationTransport,
  EventTransport,
  isDepartureWithinTerm,
  normalizeInput,
  TransportInput,
  TransportKind,
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
    if (input.departureAt && !isDepartureWithinTerm(input.departureAt, term.endsOn)) {
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
    kind: TransportKind,
    raw: Partial<TransportInput>,
  ): Promise<void> {
    const scope = await this.scope(user, eventId)
    const term = await this.repository.findTerm(scope, termId)
    if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const input = this.valid(kind, raw)
    this.assertFits(term, input)
    if (kind === "OWN" && (await this.repository.hasOwn(scope, termId))) {
      throw new AppException(HttpStatus.CONFLICT, "TRANSPORT_OWN_EXISTS")
    }
    await this.repository.create(scope, termId, kind, input)
  }

  private valid(kind: TransportKind, raw: Partial<TransportInput>): TransportInput {
    const input = normalizeInput(kind, raw)
    if (!input) throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
    return input
  }

  async update(
    user: Identity,
    eventId: string,
    id: string,
    raw: Partial<TransportInput>,
  ): Promise<void> {
    const scope = await this.scope(user, eventId)
    const term = await this.repository.termOfTransport(scope, id)
    if (!term) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    // The kind of a transport does not change.
    const input = this.valid(term.kind, raw)
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
  ): Promise<TransportParticipants> {
    return this.repository.participants(await this.scope(user, eventId), transportId)
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
    transportId: string,
  ): Promise<void> {
    if (!(await this.repository.choose(user.id, applicationId, termId, transportId))) {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    }
  }
}
