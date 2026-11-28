import { PrismaModule } from "@/core/prisma/prisma.module"
import { ApplicationsModule } from "@/modules/applications/applications.module"
import { IndividualRequestsController } from "@/modules/events/controllers/individual-requests.controller"
import { LastOpenedEventController } from "@/modules/events/controllers/last-opened-event.controller"
import { RoomAssignmentsController } from "@/modules/events/controllers/room-assignments.controller"
import { RoomWarningsController } from "@/modules/events/controllers/room-warnings.controller"
import { RoomsController } from "@/modules/events/controllers/rooms.controller"
import { IndividualRequestsRepository } from "@/modules/events/repositories/individual-requests.repository"
import { LastOpenedEventRepository } from "@/modules/events/repositories/last-opened-event.repository"
import { RoomAssignmentsRepository } from "@/modules/events/repositories/room-assignments.repository"
import { RoomsRepository } from "@/modules/events/repositories/rooms.repository"
import { IndividualRequestsService } from "@/modules/events/services/individual-requests.service"
import { LastOpenedEventService } from "@/modules/events/services/last-opened-event.service"
import { RoomAssignmentsService } from "@/modules/events/services/room-assignments.service"
import { RoomsService } from "@/modules/events/services/rooms.service"
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
  imports: [PrismaModule, OrganizationAccessModule, AuthModule, ApplicationsModule],
  controllers: [
    RoomsController,
    RoomAssignmentsController,
    RoomWarningsController,
    IndividualRequestsController,
    OrganizerEventsController,
    OrganizerTermsController,
    LastOpenedEventController,
  ],
  providers: [
    RoomsRepository,
    RoomsService,
    RoomAssignmentsRepository,
    RoomAssignmentsService,
    IndividualRequestsRepository,
    IndividualRequestsService,
    EventsService,
    EventsRepository,
    TermsService,
    TermsRepository,
    LastOpenedEventService,
    LastOpenedEventRepository,
  ],
})
export class EventsModule {}
