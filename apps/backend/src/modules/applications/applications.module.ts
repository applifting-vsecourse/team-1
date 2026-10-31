import { PrismaModule } from "@/core/prisma/prisma.module"
import { ParticipantsModule } from "@/modules/participants/participants.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { ApplicationsController } from "./controllers/applications.controller"
import { CapacityController } from "./controllers/capacity.controller"
import { PublicEventsController } from "./controllers/public-events.controller"
import { SubmissionStatusController } from "./controllers/submission-status.controller"
import { TermStatusController } from "./controllers/term-status.controller"
import { ApplicationsRepository } from "./repositories/applications.repository"
import { CapacityRepository } from "./repositories/capacity.repository"
import { PublicEventsRepository } from "./repositories/public-events.repository"
import { SubmissionStatusRepository } from "./repositories/submission-status.repository"
import { TermStatusRepository } from "./repositories/term-status.repository"
import { ApplicationsService } from "./services/applications.service"
import { CapacityService } from "./services/capacity.service"
import { PublicEventsService } from "./services/public-events.service"
import { SubmissionStatusService } from "./services/submission-status.service"
import { TermStatusService } from "./services/term-status.service"
import { WaitlistExpiryScheduler } from "./services/waitlist-expiry.scheduler"
import { WaitlistExpiryService } from "./services/waitlist-expiry.service"

@Module({
  imports: [PrismaModule, ParticipantsModule, OrganizationAccessModule, AuthModule],
  controllers: [
    PublicEventsController,
    ApplicationsController,
    CapacityController,
    SubmissionStatusController,
    TermStatusController,
  ],
  providers: [
    CapacityRepository,
    CapacityService,
    PublicEventsService,
    PublicEventsRepository,
    ApplicationsService,
    ApplicationsRepository,
    SubmissionStatusService,
    SubmissionStatusRepository,
    TermStatusRepository,
    TermStatusService,
    WaitlistExpiryService,
    WaitlistExpiryScheduler,
  ],
  exports: [TermStatusService],
})
export class ApplicationsModule {}
