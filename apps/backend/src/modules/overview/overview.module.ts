import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { OccupancyController } from "./controllers/occupancy.controller"
import { OccupancyRepository } from "./repositories/occupancy.repository"
import { OccupancyService } from "./services/occupancy.service"

@Module({
  imports: [PrismaModule, OrganizationAccessModule, AuthModule],
  controllers: [OccupancyController],
  providers: [OccupancyService, OccupancyRepository],
})
export class OverviewModule {}
