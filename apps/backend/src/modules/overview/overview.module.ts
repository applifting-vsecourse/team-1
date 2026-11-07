import { PrismaModule } from "@/core/prisma/prisma.module"
import { ApplicationsModule } from "@/modules/applications/applications.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { ApplicationListController } from "./controllers/application-list.controller"
import { AttentionController } from "./controllers/attention.controller"
import { OccupancyController } from "./controllers/occupancy.controller"
import { PaymentOverviewController } from "./controllers/payment-overview.controller"
import { ApplicationListRepository } from "./repositories/application-list.repository"
import { OccupancyRepository } from "./repositories/occupancy.repository"
import { PaymentOverviewRepository } from "./repositories/payment-overview.repository"
import { ApplicationListService } from "./services/application-list.service"
import { AttentionService } from "./services/attention.service"
import { OccupancyService } from "./services/occupancy.service"
import { PaymentOverviewService } from "./services/payment-overview.service"

@Module({
  imports: [PrismaModule, OrganizationAccessModule, AuthModule, ApplicationsModule],
  controllers: [
    OccupancyController,
    ApplicationListController,
    PaymentOverviewController,
    AttentionController,
  ],
  providers: [
    OccupancyService,
    OccupancyRepository,
    ApplicationListService,
    ApplicationListRepository,
    PaymentOverviewService,
    PaymentOverviewRepository,
    AttentionService,
  ],
})
export class OverviewModule {}
