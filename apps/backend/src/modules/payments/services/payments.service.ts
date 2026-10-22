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

  async save(
    user: Identity,
    applicationId: string,
    amountCzk?: number,
    paymentId?: string,
  ): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    await this.repository.save(applicationId, organizationId, user.id, amountCzk, paymentId)
  }

  async remove(user: Identity, applicationId: string, paymentId: string): Promise<void> {
    const { organizationId } = await this.access.assertCanAccessApplication(user, applicationId)
    await this.repository.remove(applicationId, organizationId, paymentId)
  }
}
