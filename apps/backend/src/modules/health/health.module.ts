import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { OrganizerHealthController } from "./controllers/organizer-health.controller"
import { ParticipantHealthController } from "./controllers/participant-health.controller"
import { HealthRepository } from "./repositories/health.repository"
import { HealthService } from "./services/health.service"

@Module({
  imports: [PrismaModule, AuthModule, OrganizationAccessModule],
  controllers: [ParticipantHealthController, OrganizerHealthController],
  providers: [HealthRepository, HealthService],
})
export class HealthModule {}
