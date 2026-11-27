import {
  outstandingOverpayments,
  paymentOverview,
  PaymentOverview,
} from "@/modules/overview/domain/payment-overview"
import { PaymentOverviewRepository } from "@/modules/overview/repositories/payment-overview.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { Injectable } from "@nestjs/common"

@Injectable()
export class PaymentOverviewService {
  constructor(
    private readonly repository: PaymentOverviewRepository,
    private readonly access: OrganizationAccessService,
  ) {}

  async getOverpayments(user: Identity, eventId: string) {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    return outstandingOverpayments(
      await this.repository.findOverpaymentCandidates(eventId, organizationId),
    )
  }

  async get(user: Identity, eventId: string): Promise<PaymentOverview> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const data = await this.repository.find(eventId, organizationId)
    return paymentOverview(data.terms, data.paymentPeriodDays, new Date())
  }
}
