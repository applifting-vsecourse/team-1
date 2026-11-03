import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { Module } from "@nestjs/common"
import { MeController } from "./controllers/me.controller"
import { OrganizerProfileController } from "./controllers/organizer-profile.controller"
import { AccountRepository } from "./repositories/account.repository"
import { AccountService } from "./services/account.service"
import { EmailChangeService } from "./services/email-change.service"

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [MeController, OrganizerProfileController],
  providers: [AccountService, EmailChangeService, AccountRepository],
})
export class AccountModule {}
