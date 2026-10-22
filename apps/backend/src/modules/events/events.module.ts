import { PrismaModule } from "@/core/prisma/prisma.module"
import { RoomsController } from "@/modules/events/controllers/rooms.controller"
import { RoomsRepository } from "@/modules/events/repositories/rooms.repository"
import { RoomsService } from "@/modules/events/services/rooms.service"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"

@Module({
  imports: [PrismaModule, OrganizationAccessModule, AuthModule],
  controllers: [RoomsController],
  providers: [RoomsRepository, RoomsService],
})
export class EventsModule {}
