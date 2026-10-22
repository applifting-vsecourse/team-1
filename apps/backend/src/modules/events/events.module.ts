import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { OrganizerEventsController } from "./controllers/organizer-events.controller"
import { OrganizerTermsController } from "./controllers/organizer-terms.controller"
import { EventsRepository } from "./repositories/events.repository"
import { TermsRepository } from "./repositories/terms.repository"
import { EventsService } from "./services/events.service"
import { TermsService } from "./services/terms.service"

/** Stream A: events (US-12), terms (US-13), later rooms. */
@Module({
  imports: [AuthModule, PrismaModule, OrganizationAccessModule],
  controllers: [OrganizerEventsController, OrganizerTermsController],
  providers: [EventsService, EventsRepository, TermsService, TermsRepository],
})
export class EventsModule {}
