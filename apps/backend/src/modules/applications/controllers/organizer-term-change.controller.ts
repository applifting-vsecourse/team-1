import {
  OrganizerTermChangePreviewQueryDto,
  OrganizerTermChangePreviewResponseDto,
  OrganizerTermChangeRequestDto,
  OrganizerTermChangeResponseDto,
  OrganizerTermOptionDto,
  OrganizerWithdrawalPreviewResponseDto,
  OrganizerWithdrawalRequestDto,
  OrganizerWithdrawalResponseDto,
} from "@/modules/applications/controllers/dto/organizer-term-change.dto"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("applications")
@Controller("organizer/applications/:applicationId/terms")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class OrganizerTermChangeController {
  constructor(private readonly statuses: TermStatusService) {}

  @Get("change-options")
  @ApiOperation({ summary: "Terms of the event an organizer can choose from (US-33)" })
  @ApiResponse({ status: 200, type: [OrganizerTermOptionDto] })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign application" })
  async options(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
  ): Promise<OrganizerTermOptionDto[]> {
    return (await this.statuses.changeOptionsForOrganizer(user, applicationId)).terms
  }

  @Get("change-preview")
  @ApiOperation({
    summary: "Impact of changing the terms of an application, before saving (US-33)",
  })
  @ApiResponse({ status: 200, type: OrganizerTermChangePreviewResponseDto })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign application" })
  async preview(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Query() query: OrganizerTermChangePreviewQueryDto,
  ): Promise<OrganizerTermChangePreviewResponseDto> {
    return OrganizerTermChangePreviewResponseDto.fromDomain(
      await this.statuses.previewChangeByOrganizer(user, applicationId, query.termIds),
    )
  }

  @Put()
  @ApiOperation({ summary: "Change the terms of an application as an organizer (US-33)" })
  @ApiResponse({ status: 200, type: OrganizerTermChangeResponseDto })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign application" })
  @ApiResponse({
    status: 409,
    description: "CAPACITY_EXCEEDED without confirmOverCapacity, or APPLICATION_DUPLICATE",
  })
  async change(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Body() body: OrganizerTermChangeRequestDto,
  ): Promise<OrganizerTermChangeResponseDto> {
    const result = await this.statuses.changeTermsByOrganizer(
      user,
      applicationId,
      body.termIds,
      body.confirmOverCapacity === true,
    )
    return {
      changed: result.changed,
      changedAt: result.changedAt.toISOString(),
      changedByName: result.changedByName,
    }
  }

  @Get("withdraw-preview")
  @ApiOperation({
    summary: "Impact of withdrawing the participant from terms, before saving (US-32)",
  })
  @ApiResponse({ status: 200, type: OrganizerWithdrawalPreviewResponseDto })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign application" })
  @ApiResponse({ status: 409, description: "A term is not one the application is in" })
  async withdrawalPreview(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Query() query: OrganizerTermChangePreviewQueryDto,
  ): Promise<OrganizerWithdrawalPreviewResponseDto> {
    return OrganizerWithdrawalPreviewResponseDto.fromDomain(
      await this.statuses.previewWithdrawalByOrganizer(user, applicationId, query.termIds),
    )
  }

  @Post("withdraw")
  @HttpCode(200)
  @ApiOperation({ summary: "Withdraw the participant from terms as an organizer (US-32)" })
  @ApiResponse({ status: 200, type: OrganizerWithdrawalResponseDto })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign application" })
  @ApiResponse({ status: 409, description: "A term is not one the application is in" })
  async withdraw(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Body() body: OrganizerWithdrawalRequestDto,
  ): Promise<OrganizerWithdrawalResponseDto> {
    const result = await this.statuses.withdrawByOrganizer(user, applicationId, body.termIds)
    return { changedAt: result.changedAt.toISOString(), changedByName: result.changedByName }
  }
}
