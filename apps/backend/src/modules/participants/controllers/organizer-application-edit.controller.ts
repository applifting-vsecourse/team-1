import { ApplicationEditService } from "@/modules/participants/services/application-edit.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, Param, Put, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
import { EditableApplicationDto, EditApplicationRequestDto } from "./dto/edit-application.dto"

@ApiTags("applications")
@Controller("organizer/applications/:applicationId/details")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class OrganizerApplicationEditController {
  constructor(private readonly edits: ApplicationEditService) {}

  @Put()
  @ApiOperation({
    summary:
      "Edit the participant's details, phone and accommodation request as an organizer (D-141, #515)",
  })
  @ApiResponse({ status: 200, type: EditableApplicationDto })
  @ApiResponse({ status: 400, description: "VALIDATION_FAILED or INVALID_PHONE" })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign application" })
  @ApiResponse({
    status: 409,
    description: "APPLICATION_NOT_EDITABLE (no live term) or APPLICATION_DUPLICATE",
  })
  async save(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Body() body: EditApplicationRequestDto,
  ): Promise<EditableApplicationDto> {
    return this.edits.saveByOrganizer(user, applicationId, body)
  }
}
