import { MyApplicationResponseDto } from "@/modules/participants/controllers/dto/my-application.response.dto"
import { MyApplicationsService } from "@/modules/participants/services/my-applications.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, Param } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("participants")
@Controller("participant/applications")
@Auth("PARTICIPANT")
export class MyApplicationsController {
  constructor(private readonly applications: MyApplicationsService) {}

  @Get()
  @ApiOperation({ summary: "Applications of the signed-in participant, newest first (US-54)" })
  @ApiResponse({ status: 200, type: [MyApplicationResponseDto] })
  async list(@User() user: Identity): Promise<MyApplicationResponseDto[]> {
    const applications = await this.applications.list(user)
    return applications.map(MyApplicationResponseDto.fromDomain)
  }

  @Get(":id")
  @ApiOperation({ summary: "One application of the signed-in participant (US-54)" })
  @ApiResponse({ status: 200, type: MyApplicationResponseDto })
  @ApiResponse({ status: 403, description: "Not the participant's own application" })
  async get(@User() user: Identity, @Param("id") id: string): Promise<MyApplicationResponseDto> {
    return MyApplicationResponseDto.fromDomain(await this.applications.get(user, id))
  }
}
