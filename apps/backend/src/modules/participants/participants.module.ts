import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { Module } from "@nestjs/common"
import { ParticipantAccountsRepository } from "./repositories/participant-accounts.repository"
import { ApplicationConfirmationMailer } from "./services/application-confirmation-mailer.service"
import { ParticipantAccountsService } from "./services/participant-accounts.service"

/** Owned by stream C. Imported by the applications module (stream B). */
@Module({
  imports: [AuthModule, PrismaModule],
  providers: [
    ParticipantAccountsService,
    ParticipantAccountsRepository,
    ApplicationConfirmationMailer,
  ],
  exports: [ParticipantAccountsService, ApplicationConfirmationMailer],
})
export class ParticipantsModule {}
