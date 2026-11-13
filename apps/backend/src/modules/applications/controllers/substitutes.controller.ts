import { SubstituteRecordDto } from "@/modules/applications/controllers/dto/substitute-record.dto"
import { SubstituteListResponseDto } from "@/modules/applications/controllers/dto/substitutes.dto"
import { SubstitutesService } from "@/modules/applications/services/substitutes.service"
import { TermStatusService } from "@/modules/applications/services/term-status.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, HttpCode, Param, Post } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("applications")
@Controller("organizer/events/:eventId/terms/:termId/substitutes")
@Auth("ORGANIZER")
export class SubstitutesController {
  constructor(
    private readonly substitutes: SubstitutesService,
    private readonly statuses: TermStatusService,
  ) {}

  @Get("history")
  @ApiOperation({
    summary: "System record of confirmations from the waitlist and who they skipped (US-105)",
  })
  @ApiResponse({ status: 200, type: [SubstituteRecordDto] })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign event" })
  @ApiResponse({ status: 404, description: "The term is not a term of the event" })
  async history(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
  ): Promise<SubstituteRecordDto[]> {
    return (await this.statuses.getSubstituteRecords(user, eventId, termId)).map((record) =>
      SubstituteRecordDto.fromDomain(record),
    )
  }

  @Get()
  @ApiOperation({
    summary:
      "Waitlisted applications a free bed of the term is for, in order of receipt, the first of each bed group proposed (US-104, US-31)",
  })
  @ApiResponse({ status: 200, type: SubstituteListResponseDto })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign event" })
  @ApiResponse({ status: 404, description: "The term is not a term of the event" })
  async list(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
  ): Promise<SubstituteListResponseDto> {
    return SubstituteListResponseDto.fromDomain(await this.substitutes.list(user, eventId, termId))
  }

  @Post(":applicationId/confirm")
  @HttpCode(204)
  @ApiOperation({ summary: "Confirm one waitlisted application into a free bed (US-104)" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign event" })
  @ApiResponse({
    status: 409,
    description: "BED_ALREADY_TAKEN or INVALID_STATUS_TRANSITION",
  })
  async confirm(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("termId") termId: string,
    @Param("applicationId") applicationId: string,
  ): Promise<void> {
    await this.substitutes.confirm(user, eventId, termId, applicationId)
  }
}
