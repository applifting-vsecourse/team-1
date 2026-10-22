import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { Module } from "@nestjs/common"
import { MyApplicationsController } from "./controllers/my-applications.controller"
import { ParticipantPasswordController } from "./controllers/participant-password.controller"
import { MyApplicationsRepository } from "./repositories/my-applications.repository"
import { ParticipantAccountsRepository } from "./repositories/participant-accounts.repository"
import { ApplicationConfirmationMailer } from "./services/application-confirmation-mailer.service"
import { MyApplicationsService } from "./services/my-applications.service"
import { ParticipantAccountsService } from "./services/participant-accounts.service"
import { ParticipantPasswordService } from "./services/participant-password.service"

/** Owned by stream C. Imported by the applications module (stream B). */
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ParticipantPasswordController, MyApplicationsController],
  providers: [
    ParticipantAccountsService,
    ParticipantPasswordService,
    MyApplicationsService,
    MyApplicationsRepository,
    ParticipantAccountsRepository,
    ApplicationConfirmationMailer,
  ],
  exports: [ParticipantAccountsService, ApplicationConfirmationMailer, MyApplicationsRepository],
})
export class ParticipantsModule {}
