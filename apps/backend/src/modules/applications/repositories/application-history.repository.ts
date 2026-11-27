import { PrismaService } from "@/core/prisma/prisma.service"
import {
  ApplicationHistorySource,
  HistoryEdit,
} from "@/modules/applications/domain/application-history"
import { Injectable } from "@nestjs/common"

@Injectable()
export class ApplicationHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    applicationId: string,
    organizationId: string,
  ): Promise<ApplicationHistorySource | null> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, organizationId },
      select: {
        email: true,
        submittedAt: true,
        edits: {
          select: {
            id: true,
            authorName: true,
            changedFields: true,
            before: true,
            after: true,
            createdAt: true,
          },
        },
        terms: {
          select: {
            term: { select: { id: true, name: true, startsOn: true, endsOn: true } },
            statusChanges: { include: { changedBy: { select: { name: true } } } },
            payments: { include: { recordedBy: { select: { name: true } } } },
          },
        },
      },
    })
    if (!application) return null

    // The values are written by the edit itself, a flat object of the edited fields.
    const values = (json: unknown): HistoryEdit["before"] =>
      json !== null && typeof json === "object" ? (json as HistoryEdit["before"]) : {}

    return {
      applicantEmail: application.email,
      createdAt: application.submittedAt,
      statusChanges: application.terms.flatMap(({ term, statusChanges }) =>
        statusChanges.map((change) => ({
          id: change.id,
          termId: term.id,
          termName: term.name,
          startsOn: term.startsOn,
          endsOn: term.endsOn,
          fromStatus: change.fromStatus,
          toStatus: change.toStatus,
          changedByName: change.changedBy?.name ?? null,
          changedAt: change.createdAt,
        })),
      ),
      terms: application.terms.map(({ term }) => term),
      edits: application.edits.map((edit) => ({
        id: edit.id,
        authorName: edit.authorName,
        changedFields: edit.changedFields,
        before: values(edit.before),
        after: values(edit.after),
        changedAt: edit.createdAt,
      })),
      paymentRows: application.terms.flatMap(({ payments }) =>
        payments.map((payment) => ({
          receiptId: payment.receiptId,
          correctsReceiptId: payment.correctsReceiptId,
          amountCzk: payment.amountCzk,
          recordedByName: payment.recordedBy.name,
          createdAt: payment.createdAt,
          cancelledAt: payment.cancelledAt,
        })),
      ),
    }
  }
}
