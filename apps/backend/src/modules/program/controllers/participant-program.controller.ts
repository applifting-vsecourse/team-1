import { ApplicationProgramResponseDto } from "@/modules/program/controllers/dto/program.dto"
import { ProgramService } from "@/modules/program/services/program.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, Param, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("program")
@Auth("PARTICIPANT")
@Controller("participant/applications/:applicationId/program")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({
  status: 403,
  description: "Wrong account type or not the participant's application",
})
export class ParticipantProgramController {
  constructor(private readonly program: ProgramService) {}

  @Get()
  @ApiOperation({
    summary:
      "Program of the terms the application is confirmed in (US-66); read live, never cached",
  })
  @ApiResponse({ status: 200, type: ApplicationProgramResponseDto })
  async get(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
  ): Promise<ApplicationProgramResponseDto> {
    return this.program.ofApplication(user, applicationId)
  }
}
