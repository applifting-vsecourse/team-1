import { Notification } from "@/modules/notifications/domain/notification"
import { NotificationsRepository } from "@/modules/notifications/repositories/notifications.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { HttpStatus, Injectable } from "@nestjs/common"

/** What the signed-in user reads and marks; the owner always comes from the session. */
@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  list(user: Identity): Promise<Notification[]> {
    return this.repository.listForUser(user.id)
  }

  unreadCount(user: Identity): Promise<number> {
    return this.repository.countUnread(user.id)
  }

  /** Somebody else's notification looks the same as one that does not exist: 404, no content. */
  async markRead(user: Identity, id: string): Promise<void> {
    if (!(await this.repository.markRead(user.id, id)))
      throw new AppException(HttpStatus.NOT_FOUND, "NOT_FOUND")
  }

  markAllRead(user: Identity): Promise<void> {
    return this.repository.markAllRead(user.id)
  }
}
