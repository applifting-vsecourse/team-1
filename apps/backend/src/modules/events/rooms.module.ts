import { PrismaModule } from "@/core/prisma/prisma.module"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"
import { RoomsController } from "./controllers/rooms.controller"
import { RoomsRepository } from "./repositories/rooms.repository"
import { RoomsService } from "./services/rooms.service"

@Module({
  imports: [PrismaModule, AuthModule, OrganizationAccessModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsRepository],
})
export class RoomsModule {}
