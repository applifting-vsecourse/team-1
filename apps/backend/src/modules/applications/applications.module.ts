import { PrismaModule } from "@/core/prisma/prisma.module"
import { NotificationsModule } from "@/modules/notifications/notifications.module"
import { ParticipantsModule } from "@/modules/participants/participants.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { RateLimitModule } from "@/shared/rate-limit/rate-limit.module"
import { Module } from "@nestjs/common"
import { ApplicationsController } from "./controllers/applications.controller"
import { BulkConfirmationController } from "./controllers/bulk-confirmation.controller"
import { BulkDecisionController } from "./controllers/bulk-decision.controller"
import { CapacityController } from "./controllers/capacity.controller"
import {
  OrganizerChangeRequestController,
  ParticipantChangeRequestController,
  ParticipantChangeRequestNotificationsController,
} from "./controllers/change-request.controller"
import { OrganizerTermChangeController } from "./controllers/organizer-term-change.controller"
import { ParticipantTermChangeController } from "./controllers/participant-term-change.controller"
import { PublicCatalogController } from "./controllers/public-catalog.controller"
import { PublicEventsController } from "./controllers/public-events.controller"
import { SubmissionStatusController } from "./controllers/submission-status.controller"
import { SubstitutesController } from "./controllers/substitutes.controller"
import { TermStatusController } from "./controllers/term-status.controller"
import { ApplicationsRepository } from "./repositories/applications.repository"
import { BulkConfirmationRepository } from "./repositories/bulk-confirmation.repository"
import { BulkDecisionRepository } from "./repositories/bulk-decision.repository"
import { CapacityRepository } from "./repositories/capacity.repository"
import { ChangeRequestRepository } from "./repositories/change-request.repository"
import { PublicCatalogRepository } from "./repositories/public-catalog.repository"
import { PublicEventsRepository } from "./repositories/public-events.repository"
import { SubmissionStatusRepository } from "./repositories/submission-status.repository"
import { SubstitutesRepository } from "./repositories/substitutes.repository"
import { TermStatusRepository } from "./repositories/term-status.repository"
import { ApplicationsService } from "./services/applications.service"
import { BulkConfirmationService } from "./services/bulk-confirmation.service"
import { BulkDecisionService } from "./services/bulk-decision.service"
import { CapacityService } from "./services/capacity.service"
import { ChangeRequestService } from "./services/change-request.service"
import { ContactEmailSyncService } from "./services/contact-email-sync.service"
import { PublicCatalogService } from "./services/public-catalog.service"
import { PublicEventsService } from "./services/public-events.service"
import { SubmissionStatusService } from "./services/submission-status.service"
import { SubstitutesService } from "./services/substitutes.service"
import { TermStatusService } from "./services/term-status.service"
import { WaitlistExpiryScheduler } from "./services/waitlist-expiry.scheduler"
import { WaitlistExpiryService } from "./services/waitlist-expiry.service"

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    ParticipantsModule,
    OrganizationAccessModule,
    AuthModule,
    RateLimitModule,
  ],
  controllers: [
    PublicEventsController,
    PublicCatalogController,
    ApplicationsController,
    CapacityController,
    ParticipantChangeRequestController,
    ParticipantChangeRequestNotificationsController,
    OrganizerChangeRequestController,
    SubmissionStatusController,
    TermStatusController,
    ParticipantTermChangeController,
    OrganizerTermChangeController,
    BulkConfirmationController,
    BulkDecisionController,
    SubstitutesController,
  ],
  providers: [
    CapacityRepository,
    ChangeRequestRepository,
    ChangeRequestService,
    CapacityService,
    PublicEventsService,
    PublicEventsRepository,
    PublicCatalogService,
    PublicCatalogRepository,
    ApplicationsService,
    ApplicationsRepository,
    ContactEmailSyncService,
    SubmissionStatusService,
    SubmissionStatusRepository,
    TermStatusRepository,
    TermStatusService,
    BulkConfirmationRepository,
    BulkConfirmationService,
    BulkDecisionRepository,
    BulkDecisionService,
    SubstitutesRepository,
    SubstitutesService,
    WaitlistExpiryService,
    WaitlistExpiryScheduler,
  ],
  exports: [TermStatusService],
})
export class ApplicationsModule {}
