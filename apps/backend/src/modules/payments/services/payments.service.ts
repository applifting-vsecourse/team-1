import { paymentSummary, PaymentSummary } from "@/modules/payments/domain/payment"
import { PaymentsRepository } from "@/modules/payments/repositories/payments.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { ForbiddenException, Injectable } from "@nestjs/common"

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  async get(user: Identity, applicationId: string): Promise<PaymentSummary> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    const application = await this.repository.find(applicationId, organizationId)
    if (!application) throw new ForbiddenException()
    return paymentSummary(application)
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
    await this.repository.remove(applicationId, organizationId, receiptId)
  }
}
