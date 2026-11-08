import { PrismaModule } from "@/core/prisma/prisma.module"
import { NotificationsModule } from "@/modules/notifications/notifications.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { Module } from "@nestjs/common"
import { MyApplicationsController } from "./controllers/my-applications.controller"
import { ParticipantPasswordController } from "./controllers/participant-password.controller"
import { ApplicationEditRepository } from "./repositories/application-edit.repository"
import { MyApplicationsRepository } from "./repositories/my-applications.repository"
import { ParticipantAccountsRepository } from "./repositories/participant-accounts.repository"
import { ApplicationConfirmationMailer } from "./services/application-confirmation-mailer.service"
import { ApplicationEditService } from "./services/application-edit.service"
import { MyApplicationsService } from "./services/my-applications.service"
import { ParticipantAccountsService } from "./services/participant-accounts.service"
import { ParticipantPasswordService } from "./services/participant-password.service"

/** Imported by the applications module. */
@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [ParticipantPasswordController, MyApplicationsController],
  providers: [
    ParticipantAccountsService,
    ParticipantPasswordService,
    MyApplicationsService,
    MyApplicationsRepository,
    ApplicationEditService,
    ApplicationEditRepository,
    ParticipantAccountsRepository,
    ApplicationConfirmationMailer,
  ],
  exports: [ParticipantAccountsService, ApplicationConfirmationMailer],
})
export class ParticipantsModule {}
