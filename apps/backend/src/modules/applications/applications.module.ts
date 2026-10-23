import { PrismaModule } from "@/core/prisma/prisma.module"
import { ParticipantsModule } from "@/modules/participants/participants.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { ApplicationsController } from "./controllers/applications.controller"
import { CapacityController } from "./controllers/capacity.controller"
import { PublicEventsController } from "./controllers/public-events.controller"
import { ApplicationsRepository } from "./repositories/applications.repository"
import { CapacityRepository } from "./repositories/capacity.repository"
import { PublicEventsRepository } from "./repositories/public-events.repository"
import { ApplicationsService } from "./services/applications.service"
import { CapacityService } from "./services/capacity.service"
import { PublicEventsService } from "./services/public-events.service"

@Module({
  imports: [PrismaModule, ParticipantsModule, OrganizationAccessModule, AuthModule],
  controllers: [PublicEventsController, ApplicationsController, CapacityController],
  providers: [
    CapacityRepository,
    CapacityService,
    PublicEventsService,
    PublicEventsRepository,
    ApplicationsService,
    ApplicationsRepository,
  ],
})
export class ApplicationsModule {}
