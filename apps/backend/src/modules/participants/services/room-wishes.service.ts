import { ApplicationScope, editorOf } from "@/modules/applications/domain/application-scope"
import { RoomWishesRepository } from "@/modules/participants/repositories/room-wishes.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { cleanRoomWishes } from "@/shared/domain/room-wishes"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

/**
 * US-146: a participant with a confirmed term writes who they want to room with. The organizer
 * writes the same for the participant (D-191, #787), with the same conditions.
 */
@Injectable()
export class RoomWishesService {
  constructor(
    private readonly wishes: RoomWishesRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  /** An empty list deletes the wishes. Never touches the status, capacity or evaluation. */
  async save(
    user: Identity,
    applicationId: string,
    termId: string,
    names: string[],
    noRoomWishes = false,
  ): Promise<void> {
    await this.write({ userId: user.id }, applicationId, termId, names, noRoomWishes)
  }

  /** An organizer of the application's organization writes it; the history records who. */
  async saveByOrganizer(
    user: Identity,
    applicationId: string,
    termId: string,
    names: string[],
    noRoomWishes = false,
  ): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    await this.write({ organizationId }, applicationId, termId, names, noRoomWishes, editorOf(user))
  }

  private async write(
    scope: ApplicationScope,
    applicationId: string,
    termId: string,
    names: string[],
    noRoomWishes: boolean,
    editor?: ReturnType<typeof editorOf>,
  ): Promise<void> {
    const target = await this.wishes.findTarget(scope, applicationId, termId)
    if (target.kind === "NOT_FOUND") {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your application")
    }
    if (target.kind === "TERM_CANCELLED") {
      throw new AppException(HttpStatus.CONFLICT, "TERM_CANCELLED")
    }
    if (target.kind === "NOT_AVAILABLE") {
      throw new AppException(HttpStatus.CONFLICT, "ROOM_WISHES_NOT_AVAILABLE")
    }
    const cleanedNames = cleanRoomWishes(names)
    if (noRoomWishes) {
      if (cleanedNames.length > 0) {
        throw new AppException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED")
      }
      if (!(await this.wishes.decline(target, scope, editor))) {
        throw new AppException(HttpStatus.CONFLICT, "ROOM_WISHES_NOT_AVAILABLE")
      }
      return
    }
    await this.wishes.save(target, cleanedNames, editor)
  }
}
