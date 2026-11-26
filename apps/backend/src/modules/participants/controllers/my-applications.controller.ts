import { MyApplicationResponseDto } from "@/modules/participants/controllers/dto/my-application.response.dto"
import { ApplicationEditService } from "@/modules/participants/services/application-edit.service"
import { MyApplicationsService } from "@/modules/participants/services/my-applications.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, Get, Param, Put, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { EditableApplicationDto, EditApplicationRequestDto } from "./dto/edit-application.dto"

@ApiTags("participants")
@Controller("participant/applications")
@Auth("PARTICIPANT")
export class MyApplicationsController {
  constructor(
    private readonly applications: MyApplicationsService,
    private readonly edits: ApplicationEditService,
  ) {}

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

  @Get(":id/edit")
  @ApiOperation({ summary: "Editable details and edit history of the signed-in applicant" })
  @ApiResponse({ status: 200, type: EditableApplicationDto })
  async editDetails(
    @User() user: Identity,
    @Param("id") id: string,
  ): Promise<EditableApplicationDto> {
    return this.edits.get(user, id)
  }

  @Put(":id/edit")
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @ApiOperation({ summary: "Update personal details, phone and accommodation request" })
  @ApiResponse({ status: 200, type: EditableApplicationDto })
  async saveEdit(
    @User() user: Identity,
    @Param("id") id: string,
    @Body() body: EditApplicationRequestDto,
  ): Promise<EditableApplicationDto> {
    return this.edits.save(user, id, body)
  }
}
