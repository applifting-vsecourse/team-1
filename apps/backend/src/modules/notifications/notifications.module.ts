import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { Module } from "@nestjs/common"
import { NotificationsController } from "./controllers/notifications.controller"
import { NotificationsRepository } from "./repositories/notifications.repository"
import { NotificationsService } from "./services/notifications.service"

/** The repository is exported: changes write their notification in their own transaction. */
@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsRepository],
})
export class NotificationsModule {}
