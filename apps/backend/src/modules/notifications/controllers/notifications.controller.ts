import { NotificationsService } from "@/modules/notifications/services/notifications.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { NotificationResponseDto, UnreadCountResponseDto } from "./dto/notification.response.dto"

/** The signed-in user's own notifications (US-118); there is no way to name someone else's. */
@ApiTags("notifications")
@Controller("notifications")
@Auth()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Notifications of the signed-in user, newest first" })
  @ApiResponse({ status: 200, type: [NotificationResponseDto] })
  async list(@User() user: Identity): Promise<NotificationResponseDto[]> {
    return (await this.notifications.list(user)).map(NotificationResponseDto.fromDomain)
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Number of unread notifications (the number in the header)" })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  async unreadCount(@User() user: Identity): Promise<UnreadCountResponseDto> {
    return { count: await this.notifications.unreadCount(user) }
  }

  @Post("read-all")
  @HttpCode(204)
  @ApiOperation({ summary: "Marks all of the user's notifications as read" })
  @ApiResponse({ status: 204 })
  async markAllRead(@User() user: Identity): Promise<void> {
    await this.notifications.markAllRead(user)
  }

  @Post(":id/read")
  @HttpCode(204)
  @ApiOperation({ summary: "Marks one notification as read; the record stays" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: "Not the user's notification, or does not exist" })
  async markRead(@User() user: Identity, @Param("id") id: string): Promise<void> {
    await this.notifications.markRead(user, id)
  }
}
