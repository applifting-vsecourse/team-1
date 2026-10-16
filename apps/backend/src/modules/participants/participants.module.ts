import { Module } from '@nestjs/common';
import { ApplicationConfirmationMailer } from './services/application-confirmation-mailer.service';
import { ParticipantAccountsService } from './services/participant-accounts.service';

/** Owned by stream C. Imported by the applications module (stream B). */
@Module({
  providers: [ParticipantAccountsService, ApplicationConfirmationMailer],
  exports: [ParticipantAccountsService, ApplicationConfirmationMailer],
})
export class ParticipantsModule {}
