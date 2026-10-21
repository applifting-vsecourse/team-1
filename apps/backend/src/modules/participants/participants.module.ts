import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { Module } from "@nestjs/common"
import { ParticipantPasswordController } from "./controllers/participant-password.controller"
import { ParticipantAccountsRepository } from "./repositories/participant-accounts.repository"
import { ApplicationConfirmationMailer } from "./services/application-confirmation-mailer.service"
import { ParticipantAccountsService } from "./services/participant-accounts.service"
import { ParticipantPasswordService } from "./services/participant-password.service"

/** Owned by stream C. Imported by the applications module (stream B). */
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ParticipantPasswordController],
  providers: [
    ParticipantAccountsService,
    ParticipantPasswordService,
    ParticipantAccountsRepository,
    ApplicationConfirmationMailer,
  ],
  exports: [ParticipantAccountsService, ApplicationConfirmationMailer],
})
export class ParticipantsModule {}
