import { TermAssignments } from "@/modules/events/domain/room-assignment"
import { RoomProposal } from "@/modules/events/domain/room-proposal"
import { RoomWarningKind } from "@/modules/events/domain/room-warnings"
import { RoomAssignmentsRepository } from "@/modules/events/repositories/room-assignments.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { Injectable } from "@nestjs/common"

@Injectable()
export class RoomAssignmentsService {
  constructor(
    private readonly repository: RoomAssignmentsRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  private async scope(user: Identity, eventId: string, termId: string) {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return { eventId, termId, organizationId }
  }

  async list(user: Identity, eventId: string, termId: string): Promise<TermAssignments> {
    return this.repository.find(await this.scope(user, eventId, termId))
  }

  async assign(
    user: Identity,
    eventId: string,
    termId: string,
    applicationTermId: string,
    roomId: string,
    alsoTermIds: string[],
    confirmExtraBed: boolean,
  ): Promise<void> {
    await this.repository.assign(
      await this.scope(user, eventId, termId),
      applicationTermId,
      roomId,
      alsoTermIds,
      confirmExtraBed,
    )
  }

  async propose(user: Identity, eventId: string, termId: string): Promise<RoomProposal> {
    return this.repository.propose(await this.scope(user, eventId, termId))
  }

  async assignMany(
    user: Identity,
    eventId: string,
    termId: string,
    items: { applicationTermId: string; roomId: string }[],
  ): Promise<void> {
    await this.repository.assignMany(await this.scope(user, eventId, termId), items)
  }

  async unassign(
    user: Identity,
    eventId: string,
    termId: string,
    applicationTermId: string,
  ): Promise<void> {
    await this.repository.unassign(await this.scope(user, eventId, termId), applicationTermId)
  }

  async acknowledgeWarning(
    user: Identity,
    eventId: string,
    termId: string,
    input: {
      kind: RoomWarningKind
      roomId: string | null
      applicationTermId: string | null
      note: string
    },
  ): Promise<void> {
    await this.repository.acknowledge(
      await this.scope(user, eventId, termId),
      input,
      user.name ?? user.email,
    )
  }
}
