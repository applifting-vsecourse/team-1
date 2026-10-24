import { ApplicationListQueryDto } from "@/modules/overview/controllers/dto/application-list-query.dto"
import { ApplicationListResponseDto } from "@/modules/overview/controllers/dto/application-list.response.dto"
import { ApplicationListService } from "@/modules/overview/services/application-list.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("overview")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@Controller("organizer/events/:eventId/applications")
export class ApplicationListController {
  constructor(private readonly applications: ApplicationListService) {}
  @Get()
  @ApiOperation({
    summary: "Applications, newest first, with combined term, status, gender and payment filters",
  })
  @ApiResponse({ status: 200, type: [ApplicationListResponseDto] })
  @ApiResponse({ status: 401, description: "Session required" })
  @ApiResponse({ status: 403, description: "Wrong account type, foreign or missing event" })
  async get(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Query() query: ApplicationListQueryDto,
  ): Promise<ApplicationListResponseDto[]> {
    return (await this.applications.get(user, eventId, query)).map((row) =>
      ApplicationListResponseDto.fromDomain(row),
    )
  }
}
