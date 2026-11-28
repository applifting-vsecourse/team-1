import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { OrganizerCostCategoriesController } from "./controllers/organizer-cost-categories.controller"
import { CostCategoriesRepository } from "./repositories/cost-categories.repository"
import { CostCategoriesService } from "./services/cost-categories.service"

@Module({
  imports: [PrismaModule, AuthModule, OrganizationAccessModule],
  controllers: [OrganizerCostCategoriesController],
  providers: [CostCategoriesRepository, CostCategoriesService],
})
export class EconomicsModule {}
