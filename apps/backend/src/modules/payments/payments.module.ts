import { PrismaModule } from "@/core/prisma/prisma.module"
import { NotificationsModule } from "@/modules/notifications/notifications.module"
import { ParticipantsModule } from "@/modules/participants/participants.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { BankStatementsController } from "./controllers/bank-statements.controller"
import { ParticipantPaymentsController } from "./controllers/participant-payments.controller"
import { PaymentsController } from "./controllers/payments.controller"
import { BankTransactionsRepository } from "./repositories/bank-transactions.repository"
import { PaymentsRepository } from "./repositories/payments.repository"
import { BankStatementsService } from "./services/bank-statements.service"
import { PaymentsService } from "./services/payments.service"

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    AuthModule,
    OrganizationAccessModule,
    ParticipantsModule,
  ],
  controllers: [PaymentsController, ParticipantPaymentsController, BankStatementsController],
  providers: [
    PaymentsRepository,
    PaymentsService,
    BankTransactionsRepository,
    BankStatementsService,
  ],
})
export class PaymentsModule {}
