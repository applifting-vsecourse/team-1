import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { MeController } from "./controllers/me.controller"
import { OrganizationsController } from "./controllers/organizations.controller"
import { OrganizerProfileController } from "./controllers/organizer-profile.controller"
import { AccountRepository } from "./repositories/account.repository"
import { OrganizationsRepository } from "./repositories/organizations.repository"
import { AccountService } from "./services/account.service"
import { EmailChangeService } from "./services/email-change.service"
import { OrganizationsService } from "./services/organizations.service"

@Module({
  imports: [AuthModule, PrismaModule, OrganizationAccessModule],
  controllers: [MeController, OrganizerProfileController, OrganizationsController],
  providers: [
    AccountService,
    EmailChangeService,
    AccountRepository,
    OrganizationsService,
    OrganizationsRepository,
  ],
})
export class AccountModule {}
