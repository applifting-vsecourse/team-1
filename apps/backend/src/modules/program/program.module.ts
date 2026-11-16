import { PrismaModule } from "@/core/prisma/prisma.module"
import { OrganizerProgramController } from "@/modules/program/controllers/organizer-program.controller"
import { ParticipantProgramController } from "@/modules/program/controllers/participant-program.controller"
import { ProgramRepository } from "@/modules/program/repositories/program.repository"
import { ProgramService } from "@/modules/program/services/program.service"
import { AuthModule } from "@/shared/auth/auth.module"
import { OrganizationAccessModule } from "@/shared/organization-access/organization-access.module"
import { Module } from "@nestjs/common"

@Module({
  imports: [PrismaModule, AuthModule, OrganizationAccessModule],
  controllers: [OrganizerProgramController, ParticipantProgramController],
  providers: [ProgramService, ProgramRepository],
})
export class ProgramModule {}
