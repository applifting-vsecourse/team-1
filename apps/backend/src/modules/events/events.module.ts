import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { OrganizerEventsController } from "./controllers/organizer-events.controller"
import { EventsRepository } from "./repositories/events.repository"
import { EventsService } from "./services/events.service"

/** Stream A: events (US-12), later terms and rooms. */
@Module({
  imports: [AuthModule, PrismaModule, OrganizationAccessModule],
  controllers: [OrganizerEventsController],
  providers: [EventsService, EventsRepository],
})
export class EventsModule {}
