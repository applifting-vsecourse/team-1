import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { ApplicationListController } from "./controllers/application-list.controller"
import { OccupancyController } from "./controllers/occupancy.controller"
import { ApplicationListRepository } from "./repositories/application-list.repository"
import { OccupancyRepository } from "./repositories/occupancy.repository"
import { ApplicationListService } from "./services/application-list.service"
import { OccupancyService } from "./services/occupancy.service"

@Module({
  imports: [PrismaModule, OrganizationAccessModule, AuthModule],
  controllers: [OccupancyController, ApplicationListController],
  providers: [
    OccupancyService,
    OccupancyRepository,
    ApplicationListService,
    ApplicationListRepository,
  ],
})
export class OverviewModule {}
