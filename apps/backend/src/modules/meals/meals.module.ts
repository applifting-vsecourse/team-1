import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { OrganizerMealsController } from "./controllers/organizer-meals.controller"
import { ParticipantMealsController } from "./controllers/participant-meals.controller"
import { MealsRepository } from "./repositories/meals.repository"
import { MealsService } from "./services/meals.service"

@Module({
  imports: [PrismaModule, AuthModule, OrganizationAccessModule],
  controllers: [OrganizerMealsController, ParticipantMealsController],
  providers: [MealsRepository, MealsService],
})
export class MealsModule {}
