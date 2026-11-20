import { PrismaModule } from "@/core/prisma/prisma.module"
import { NotificationsModule } from "@/modules/notifications/notifications.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { MyApplicationsController } from "./controllers/my-applications.controller"
import { OrganizerApplicationEditController } from "./controllers/organizer-application-edit.controller"
import { ParticipantPasswordController } from "./controllers/participant-password.controller"
import { RoomWishesController } from "./controllers/room-wishes.controller"
import { StayController } from "./controllers/stay.controller"
import { ApplicationEditRepository } from "./repositories/application-edit.repository"
import { MyApplicationsRepository } from "./repositories/my-applications.repository"
import { ParticipantAccountsRepository } from "./repositories/participant-accounts.repository"
import { RoomWishesRepository } from "./repositories/room-wishes.repository"
import { StayRepository } from "./repositories/stay.repository"
import { ApplicationConfirmationMailer } from "./services/application-confirmation-mailer.service"
import { ApplicationEditService } from "./services/application-edit.service"
import { MyApplicationsService } from "./services/my-applications.service"
import { ParticipantAccountsService } from "./services/participant-accounts.service"
import { ParticipantPasswordService } from "./services/participant-password.service"
import { RoomWishesService } from "./services/room-wishes.service"
import { StayService } from "./services/stay.service"

/** Imported by the applications module. */
@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule, OrganizationAccessModule],
  controllers: [
    ParticipantPasswordController,
    MyApplicationsController,
    OrganizerApplicationEditController,
    RoomWishesController,
    StayController,
  ],
  providers: [
    ParticipantAccountsService,
    ParticipantPasswordService,
    MyApplicationsService,
    MyApplicationsRepository,
    ApplicationEditService,
    ApplicationEditRepository,
    ParticipantAccountsRepository,
    ApplicationConfirmationMailer,
    RoomWishesService,
    RoomWishesRepository,
    StayService,
    StayRepository,
  ],
  exports: [ParticipantAccountsService, ApplicationConfirmationMailer],
})
export class ParticipantsModule {}
