import { ChangeRequestService } from "@/modules/applications/services/change-request.service"
import { Attention, computeAttention } from "@/modules/overview/domain/attention"
import { paymentOverview } from "@/modules/overview/domain/payment-overview"
import { ApplicationListRepository } from "@/modules/overview/repositories/application-list.repository"
import { PaymentOverviewRepository } from "@/modules/overview/repositories/payment-overview.repository"
import { Identity } from "@/shared/auth/domain/identity"
import { OrganizationAccessService } from "@/shared/organization-access/organization-access.service"
import { Injectable } from "@nestjs/common"

@Injectable()
export class AttentionService {
  constructor(
    private readonly applications: ApplicationListRepository,
    private readonly payments: PaymentOverviewRepository,
    private readonly changeRequests: ChangeRequestService,
    private readonly access: OrganizationAccessService,
  ) {}

  async get(user: Identity, eventId: string): Promise<Attention> {
    const { organizationId } = await this.access.assertCanAccessEvent(user, eventId)
    const [applications, payments, pending] = await Promise.all([
      this.applications.find(eventId, organizationId),
      this.payments.find(eventId, organizationId),
      this.changeRequests.pendingForEvent(user, eventId),
    ])
    return computeAttention(
      applications,
      paymentOverview(payments.terms, payments.paymentPeriodDays, new Date()),
      pending.length,
    )
  }
}
