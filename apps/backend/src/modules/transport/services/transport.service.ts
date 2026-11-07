import {
  ApplicationTransport,
  EventTransport,
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

  async list(user: Identity, eventId: string): Promise<EventTransport> {
    return this.repository.list(await this.scope(user, eventId))
  }

  async save(user: Identity, eventId: string, input: TransportInput, id?: string): Promise<void> {
    await this.repository.save(await this.scope(user, eventId), input, id)
  }

  async participants(
    user: Identity,
    eventId: string,
    transportId: string,
  ): Promise<TransportParticipants> {
    const id = transportId === OWN_TRANSPORT_ID ? null : transportId
    return this.repository.participants(await this.scope(user, eventId), id)
  }

  /** Someone else's application and a missing one look the same: 403 with no content. */
  async ofApplication(user: Identity, applicationId: string): Promise<ApplicationTransport> {
    const result = await this.repository.ofApplication(user.id, applicationId)
    if (!result) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your application")
    return result
  }

  async choose(user: Identity, applicationId: string, transportId: string | null): Promise<void> {
    const id = transportId === OWN_TRANSPORT_ID ? null : transportId
    if (!(await this.repository.choose(user.id, applicationId, id))) {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    }
  }
}
