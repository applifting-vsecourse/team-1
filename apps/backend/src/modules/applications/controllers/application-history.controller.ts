import { HistoryEntryDto } from "@/modules/applications/controllers/dto/application-history.dto"
import { ApplicationHistoryService } from "@/modules/applications/services/application-history.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, Param } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("applications")
@Controller("organizer/applications/:applicationId/history")
@Auth("ORGANIZER")
export class ApplicationHistoryController {
  constructor(private readonly history: ApplicationHistoryService) {}

  @Get()
  @ApiOperation({
    summary: "History of changes of an application: time, author and change, newest first (US-53)",
  })
  @ApiResponse({ status: 200, type: [HistoryEntryDto] })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign application" })
  async get(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
  ): Promise<HistoryEntryDto[]> {
    return (await this.history.get(user, applicationId)).map((entry) =>
      HistoryEntryDto.fromDomain(entry),
    )
  }
}
