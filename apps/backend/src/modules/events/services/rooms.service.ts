import { computeRoomCapacity } from "@/modules/applications/domain/capacity"
import { EventRooms, RoomInput, RoomMode } from "@/modules/events/domain/rooms"
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

  async list(user: Identity, eventId: string): Promise<EventRooms> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const event = await this.repository.find(eventId, organizationId)
    return { ...event, capacity: computeRoomCapacity(event.rooms) }
  }

  async setMode(user: Identity, eventId: string, mode: RoomMode): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    await this.repository.setMode(eventId, organizationId, mode)
  }

  async save(user: Identity, eventId: string, input: RoomInput, id?: string): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    await this.repository.save(eventId, organizationId, input, id)
  }

  async remove(user: Identity, eventId: string, id: string): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    await this.repository.remove(eventId, organizationId, id)
  }
}
