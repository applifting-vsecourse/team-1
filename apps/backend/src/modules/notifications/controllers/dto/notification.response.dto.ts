import { Notification } from "@/modules/notifications/domain/notification"
import { ApiProperty } from "@nestjs/swagger"

export class NotificationParamsDto {
  @ApiProperty() eventName!: string
  @ApiProperty() participantName!: string
  @ApiProperty({ description: "ISO day of the term the notification is about" })
  termStartsOn!: string
  @ApiProperty() termEndsOn!: string
  @ApiProperty({ required: false, description: "PAYMENT: amount of the receipt in the term" })
  amountCzk?: number
  @ApiProperty({ required: false, description: "PAYMENT: what is owed in the term afterwards" })
  owedCzk?: number
}

export class NotificationResponseDto {
  @ApiProperty() id!: string
  @ApiProperty({ enum: ["STATUS_CHANGED", "PAYMENT", "REQUEST"] }) type!: string
  @ApiProperty({ description: "The copy is composed from the kind and params by the frontend" })
  kind!: string
  @ApiProperty({ nullable: true, type: String }) applicationId!: string | null
  @ApiProperty({ type: NotificationParamsDto }) params!: NotificationParamsDto
  @ApiProperty() createdAt!: string
  @ApiProperty({ nullable: true, type: String, description: "Null = unread" })
  readAt!: string | null

  static fromDomain(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      kind: notification.kind,
      applicationId: notification.applicationId,
      params: notification.params,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() ?? null,
    }
  }
}

export class UnreadCountResponseDto {
  @ApiProperty() count!: number
}
