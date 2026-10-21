import { PrismaModule } from "@/core/prisma/prisma.module"
import { ParticipantsModule } from "@/modules/participants/participants.module"
import { Module } from "@nestjs/common"
import { ApplicationsController } from "./controllers/applications.controller"
import { PublicEventsController } from "./controllers/public-events.controller"
import { ApplicationsRepository } from "./repositories/applications.repository"
import { PublicEventsRepository } from "./repositories/public-events.repository"
import { ApplicationsService } from "./services/applications.service"
import { PublicEventsService } from "./services/public-events.service"

@Module({
  imports: [PrismaModule, ParticipantsModule],
  controllers: [PublicEventsController, ApplicationsController],
  providers: [
    PublicEventsService,
    PublicEventsRepository,
    ApplicationsService,
    ApplicationsRepository,
  ],
})
export class ApplicationsModule {}
