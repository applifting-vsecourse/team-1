import { computeRoomCapacity } from "@/modules/applications/domain/capacity"
import {
  RoomCopyStrategy,
  RoomGenderAssignment,
  RoomInput,
  RoomMode,
  TermRooms,
} from "@/modules/events/domain/rooms"
import { RoomsRepository } from "@/modules/events/repositories/rooms.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { Injectable } from "@nestjs/common"

@Injectable()
export class RoomsService {
  constructor(
    private readonly repository: RoomsRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  private async scope(user: Identity, eventId: string, termId: string) {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return { eventId, termId, organizationId }
  }

  async list(user: Identity, eventId: string, termId: string): Promise<TermRooms> {
    const term = await this.repository.find(await this.scope(user, eventId, termId))
    return { ...term, capacity: computeRoomCapacity(term.rooms) }
  }

  async setMode(
    user: Identity,
    eventId: string,
    termId: string,
    mode: RoomMode,
    assignments: RoomGenderAssignment[],
  ): Promise<void> {
    await this.repository.setMode(await this.scope(user, eventId, termId), mode, assignments)
  }

  async save(
    user: Identity,
    eventId: string,
    termId: string,
    input: RoomInput,
    id?: string,
  ): Promise<void> {
    await this.repository.save(await this.scope(user, eventId, termId), input, id)
  }

  async remove(user: Identity, eventId: string, termId: string, id: string): Promise<void> {
    await this.repository.remove(await this.scope(user, eventId, termId), id)
  }

  async copy(
    user: Identity,
    eventId: string,
    termId: string,
    sourceTermId: string,
    strategy: RoomCopyStrategy,
  ): Promise<void> {
    await this.repository.copy(await this.scope(user, eventId, termId), sourceTermId, strategy)
  }
}
