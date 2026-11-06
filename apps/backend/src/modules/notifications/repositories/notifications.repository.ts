import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { computeTermOwed } from "@/modules/applications/domain/pricing"
import {
  buildNotification,
  isoDay,
  NewNotification,
  Notification,
  NotificationKind,
  NotificationParams,
} from "@/modules/notifications/domain/notification"
import { Injectable } from "@nestjs/common"

type Row = Prisma.NotificationGetPayload<object>

const toDomain = (row: Row): Notification => ({
  id: row.id,
  type: row.type,
  kind: row.kind as NotificationKind,
  applicationId: row.applicationId,
  params: row.params as NotificationParams,
  createdAt: row.createdAt,
  readAt: row.readAt,
})

/**
 * The only place that touches the notification table. `create` and `notifyPayment` take the
 * transaction client of the change they describe, so the notification exists only if the change
 * does: the callers (status change, payments, the participant's own cancellation) share them
 * instead of each writing their own rows.
 */
@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Writes a notification in the transaction of the change; a null one (no account) is skipped. */
  async create(tx: Prisma.TransactionClient, notification: NewNotification | null): Promise<void> {
    if (!notification) return
    await tx.notification.create({
      data: { ...notification, params: notification.params },
    })
  }

  /** The organizer's US-86 feed can display this record when that screen is introduced. */
  async notifyOrganizersOfApplicationEdit(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string
      applicationId: string
      eventName: string
      participantName: string
    },
  ): Promise<void> {
    const members = await tx.organizationMember.findMany({
      where: { organizationId: input.organizationId, user: { accountType: "ORGANIZER" } },
      select: { userId: true },
    })
    for (const member of members) {
      await this.create(tx, {
        userId: member.userId,
        type: "REQUEST",
        kind: "APPLICATION_EDITED",
        applicationId: input.applicationId,
        params: {
          eventName: input.eventName,
          participantName: input.participantName,
        },
      })
    }
  }

  /**
   * One PAYMENT notification per term a receipt touched, with what is owed in the term after the
   * change. Call it after the payment rows are written (or cancelled).
   */
  async notifyPayment(
    tx: Prisma.TransactionClient,
    input: {
      applicationId: string
      organizationId: string
      kind: Extract<NotificationKind, "PAYMENT_RECORDED" | "PAYMENT_CANCELLED" | "PAYMENT_REFUNDED">
      /** The rows of the receipt: the application term and the signed amount of each. */
      rows: { applicationTermId: string; amountCzk: number }[]
    },
  ): Promise<void> {
    const application = await tx.application.findFirst({
      where: { id: input.applicationId, organizationId: input.organizationId },
      include: {
        event: { select: { name: true } },
        terms: {
          include: {
            term: { select: { startsOn: true, endsOn: true } },
            payments: { where: { cancelledAt: null }, select: { amountCzk: true } },
          },
        },
      },
    })
    if (!application?.userId) return

    const perTerm = new Map<string, number>()
    for (const row of input.rows)
      perTerm.set(row.applicationTermId, (perTerm.get(row.applicationTermId) ?? 0) + row.amountCzk)

    for (const [applicationTermId, amountCzk] of perTerm) {
      const term = application.terms.find((candidate) => candidate.id === applicationTermId)
      if (!term) continue
      await this.create(
        tx,
        buildNotification({
          userId: application.userId,
          applicationId: application.id,
          kind: input.kind,
          params: {
            eventName: application.event.name,
            participantName: `${application.firstName} ${application.lastName}`,
            termStartsOn: isoDay(term.term.startsOn),
            termEndsOn: isoDay(term.term.endsOn),
            amountCzk: Math.abs(amountCzk),
            owedCzk: Math.max(0, computeTermOwed(term, term.payments)),
          },
        }),
      )
    }
  }

  /** The user's notifications, newest first. */
  async listForUser(userId: string): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    })
    return rows.map(toDomain)
  }

  async countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } })
  }

  /** Marks one of the user's notifications as read; false when it is not theirs or does not exist. */
  async markRead(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    })
    if (result.count > 0) return true
    return (await this.prisma.notification.count({ where: { id, userId } })) > 0
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
  }
}
