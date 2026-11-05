import {
  computePaymentCorrectionPreview,
  PaymentCorrectionPreview,
} from "@/modules/applications/domain/payment-correction-preview"
import { variableSymbol } from "@/modules/applications/domain/variable-symbol"
import { ApplicationConfirmationMailer } from "@/modules/participants/services/application-confirmation-mailer.service"
import { paymentSummary, PaymentSummary } from "@/modules/payments/domain/payment"
import {
  PaymentDebtNotice,
  PaymentsRepository,
} from "@/modules/payments/repositories/payments.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { AppException } from "@/shared/errors/app.exception"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { HttpStatus, Injectable } from "@nestjs/common"

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly access: OrganizationAccessService,
    private readonly mailer: ApplicationConfirmationMailer,
  ) {}

  async get(user: Identity, applicationId: string): Promise<PaymentSummary> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const application = await this.repository.find(applicationId, organizationId)
    if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    return paymentSummary(application)
  }

  async previewCorrection(
    user: Identity,
    applicationId: string,
    receiptId: string,
    amountCzk: number,
    termId?: string,
  ): Promise<PaymentCorrectionPreview> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const application = await this.repository.find(applicationId, organizationId)
    const original =
      application &&
      paymentSummary(application).receipts.find(
        (receipt) => receipt.id === receiptId && receipt.cancelledAt === null,
      )
    if (!application || !original) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const result = computePaymentCorrectionPreview({
      terms: application.terms.map((term) => ({
        ...term,
        payments: term.payments.filter((row) => row.cancelledAt === null),
      })),
      receiptId,
      amountCzk,
      termId,
      isRefund: original.amountCzk < 0,
    })
    if (!result.ok)
      throw new AppException(
        result.errorCode === "REFUND_EXCEEDS_OVERPAYMENT"
          ? HttpStatus.CONFLICT
          : HttpStatus.BAD_REQUEST,
        result.errorCode,
      )
    return result.preview
  }

  /** Without `termId` a summary payment (split over the terms), with it a payment of one term. */
  async record(
    user: Identity,
    applicationId: string,
    requestId: string,
    amountCzk?: number,
    termId?: string,
  ): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    await this.repository.record({
      applicationId,
      organizationId,
      recordedById: user.id,
      requestId,
      amountCzk,
      termId,
    })
  }

  /** A refund is always one negative row of one term, so `termId` is required. */
  async refund(
    user: Identity,
    applicationId: string,
    requestId: string,
    amountCzk: number,
    termId?: string,
  ): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    await this.repository.record({
      applicationId,
      organizationId,
      recordedById: user.id,
      requestId,
      amountCzk,
      termId,
      isRefund: true,
    })
  }

  async remove(user: Identity, applicationId: string, receiptId: string): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const newDebt = await this.repository.remove(applicationId, organizationId, receiptId)
    if (newDebt !== null) await this.sendDebtNotice(applicationId, organizationId, newDebt)
  }

  async correct(
    user: Identity,
    applicationId: string,
    receiptId: string,
    requestId: string,
    amountCzk: number,
    termId?: string,
  ): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const application = await this.repository.find(applicationId, organizationId)
    if (!application) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const original = paymentSummary(application).receipts.find(
      (receipt) => receipt.id === receiptId,
    )
    if (!original) throw new AppException(HttpStatus.FORBIDDEN, "FORBIDDEN")
    const newDebt = await this.repository.correct({
      applicationId,
      organizationId,
      recordedById: user.id,
      receiptId,
      requestId,
      amountCzk,
      termId,
      isRefund: original.amountCzk < 0,
    })
    if (newDebt !== null) await this.sendDebtNotice(applicationId, organizationId, newDebt)
  }

  private async sendDebtNotice(
    applicationId: string,
    organizationId: string,
    notice: PaymentDebtNotice,
  ): Promise<void> {
    const context = await this.repository.findEmailContext(applicationId, organizationId)
    if (!context) return
    await this.mailer.sendPaymentCorrection({
      ...context,
      name: `${context.firstName} ${context.lastName}`,
      amountOwedCzk: notice.amountOwedCzk,
      debts: notice.terms.map((term) => ({
        termNumber: term.termNumber,
        amountCzk: term.amountOwedCzk,
        variableSymbol: variableSymbol(context.number, term.termNumber),
        paymentDueAt: term.paymentDueAt,
      })),
    })
  }
}
