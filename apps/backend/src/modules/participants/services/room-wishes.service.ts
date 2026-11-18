import { RoomWishesRepository } from "@/modules/participants/repositories/room-wishes.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { cleanRoomWishes } from "@/shared/domain/room-wishes"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

/** US-146: a participant with a confirmed term writes who they want to room with. */
@Injectable()
export class RoomWishesService {
  constructor(private readonly wishes: RoomWishesRepository) {}

  /** An empty list deletes the wishes. Never touches the status, capacity or evaluation. */
  async save(
    user: Identity,
    applicationId: string,
    termId: string,
    names: string[],
  ): Promise<void> {
    const target = await this.wishes.findTarget(user.id, applicationId, termId)
    if (target.kind === "NOT_FOUND") {
      throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Not your application")
    }
    if (target.kind === "TERM_CANCELLED") {
      throw new AppException(HttpStatus.CONFLICT, "TERM_CANCELLED")
    }
    if (target.kind === "NOT_AVAILABLE") {
      throw new AppException(HttpStatus.CONFLICT, "ROOM_WISHES_NOT_AVAILABLE")
    }
    await this.wishes.save(target.id, cleanRoomWishes(names))
  }
}
