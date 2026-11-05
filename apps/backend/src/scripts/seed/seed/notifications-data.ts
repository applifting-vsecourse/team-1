import { PrismaService } from "@/core/prisma/prisma.service"
import { Prisma } from "@/generated/prisma/client"
import { isoDay } from "@/modules/notifications/domain/notification"

/**
 * Notifications of the participant account (US-118), so the bell and the panel are filled on
 * staging: the payment and the confirmation of the first application are unread, the older
 * confirmation of the second one is read. Added after everything else; touches no demo data.
 */
export async function seedParticipantNotifications(
  prisma: PrismaService,
  participantId: string,
): Promise<void> {
  const applications = await prisma.application.findMany({
    where: { userId: participantId },
    orderBy: { submittedAt: "asc" },
    include: {
      event: { select: { name: true } },
      terms: { include: { term: true }, orderBy: { term: { startsOn: "asc" } } },
    },
  })
  const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * 60_000)

  const rows = applications.flatMap((application, index): Prisma.NotificationCreateManyInput[] => {
    const term = application.terms[0]
    if (!term) return []
    const params = {
      eventName: application.event.name,
      participantName: `${application.firstName} ${application.lastName}`,
      termStartsOn: isoDay(term.term.startsOn),
      termEndsOn: isoDay(term.term.endsOn),
    }
    const base = { userId: participantId, applicationId: application.id }
    if (index === 0) {
      return [
        {
          ...base,
          type: "STATUS_CHANGED" as const,
          kind: "CONFIRMED",
          params,
          createdAt: minutesAgo(30),
          readAt: null,
        },
        {
          ...base,
          type: "PAYMENT" as const,
          kind: "PAYMENT_RECORDED",
          params: { ...params, amountCzk: 500, owedCzk: 4400 },
          createdAt: minutesAgo(20),
          readAt: null,
        },
      ]
    }
    return [
      {
        ...base,
        type: "STATUS_CHANGED" as const,
        kind: "CONFIRMED",
        params,
        createdAt: minutesAgo(60 * 24),
        readAt: minutesAgo(60 * 23),
      },
    ]
  })
  await prisma.notification.createMany({ data: rows })
}
