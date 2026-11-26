import { PrismaModule } from "@/core/prisma/prisma.module"
import { OrganizerBoardController } from "@/modules/board/controllers/organizer-board.controller"
import { ParticipantBoardController } from "@/modules/board/controllers/participant-board.controller"
import { BoardRepository } from "@/modules/board/repositories/board.repository"
import { BoardService } from "@/modules/board/services/board.service"
import { NotificationsModule } from "@/modules/notifications/notifications.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"

/** The event board (US-91): posts of the organizer, read by the applicants of the chosen terms. */
@Module({
  imports: [PrismaModule, AuthModule, OrganizationAccessModule, NotificationsModule],
  controllers: [OrganizerBoardController, ParticipantBoardController],
  providers: [BoardService, BoardRepository],
})
export class BoardModule {}
