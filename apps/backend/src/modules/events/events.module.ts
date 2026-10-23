import { PrismaModule } from "@/core/prisma/prisma.module"
import { RoomsController } from "@/modules/events/controllers/rooms.controller"
import { RoomsRepository } from "@/modules/events/repositories/rooms.repository"
import { RoomsService } from "@/modules/events/services/rooms.service"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { OrganizerEventsController } from "./controllers/organizer-events.controller"
import { OrganizerTermsController } from "./controllers/organizer-terms.controller"
import { EventsRepository } from "./repositories/events.repository"
import { TermsRepository } from "./repositories/terms.repository"
import { EventsService } from "./services/events.service"
import { TermsService } from "./services/terms.service"

@Module({
  imports: [PrismaModule, OrganizationAccessModule, AuthModule],
  controllers: [RoomsController, OrganizerEventsController, OrganizerTermsController],
  providers: [RoomsRepository, RoomsService,EventsService, EventsRepository, TermsService, TermsRepository],
})
export class EventsModule {}
