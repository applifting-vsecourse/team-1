import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { OrganizerTransportController } from "./controllers/organizer-transport.controller"
import { ParticipantTransportController } from "./controllers/participant-transport.controller"
import { TransportRepository } from "./repositories/transport.repository"
import { TransportService } from "./services/transport.service"

@Module({
  imports: [PrismaModule, AuthModule, OrganizationAccessModule],
  controllers: [OrganizerTransportController, ParticipantTransportController],
  providers: [TransportService, TransportRepository],
})
export class TransportModule {}
