import { PrismaModule } from "@/core/prisma/prisma.module"
import { NotificationsModule } from "@/modules/notifications/notifications.module"
import { ParticipantsModule } from "@/modules/participants/participants.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { PaymentsController } from "./controllers/payments.controller"
import { PaymentsRepository } from "./repositories/payments.repository"
import { PaymentsService } from "./services/payments.service"

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    AuthModule,
    OrganizationAccessModule,
    ParticipantsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsRepository, PaymentsService],
})
export class PaymentsModule {}
