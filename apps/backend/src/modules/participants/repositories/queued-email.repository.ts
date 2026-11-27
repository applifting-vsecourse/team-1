import { PrismaService } from "@/core/prisma/prisma.service"
import { computeTermOwed } from "@/modules/applications/domain/pricing"
import { QueuedEmail } from "@/modules/participants/domain/queued-email"
import { Injectable } from "@nestjs/common"

/** Whether what a queued e-mail announces still holds when its turn comes (#737). */
@Injectable()
export class QueuedEmailRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isOutdated(email: QueuedEmail): Promise<boolean> {
    switch (email.template) {
      case "APPLICATION_CHANGE":
        return this.isStatusChangeOutdated(email.basis.statusChangeId)
      case "PAYMENT_RECEIVED":
        return this.isPaymentOutdated(email.basis.receiptId, email.basis.settledTermIds)
      // A cancelled term stays cancelled.
      case "TERM_CANCELLED":
        return false
    }
  }

  /** The application left the announced status in the term, or got there again by a newer change. */
  private async isStatusChangeOutdated(statusChangeId: string): Promise<boolean> {
    const change = await this.prisma.applicationTermStatusChange.findUnique({
      where: { id: statusChangeId },
      include: { applicationTerm: { select: { status: true } } },
    })
    if (!change || change.applicationTerm.status !== change.toStatus) return true
    const newer = await this.prisma.applicationTermStatusChange.count({
      where: {
        applicationTermId: change.applicationTermId,
        createdAt: { gt: change.createdAt },
      },
    })
    return newer > 0
  }

  /** The payment was cancelled, or a term it settled is no longer confirmed and paid. */
  private async isPaymentOutdated(receiptId: string, settledTermIds: string[]): Promise<boolean> {
    const active = await this.prisma.payment.count({ where: { receiptId, cancelledAt: null } })
    if (active === 0) return true
    const terms = await this.prisma.applicationTerm.findMany({
      where: { id: { in: settledTermIds } },
      include: { payments: { where: { cancelledAt: null }, select: { amountCzk: true } } },
    })
    // An archived term is a finished and paid one.
    return (
      terms.length < settledTermIds.length ||
      terms.some(
        (term) =>
          term.status !== "ARCHIVED" &&
          (term.status !== "CONFIRMED" || computeTermOwed(term, term.payments) > 0),
      )
    )
  }
}
