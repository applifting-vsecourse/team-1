import { SubstituteProposalDto } from "@/modules/applications/controllers/dto/substitute-proposal.dto"
import { SubstitutesService } from "@/modules/applications/services/substitutes.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Controller, Get, Param } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("applications")
@Controller("organizer/events/:eventId/substitute-proposals")
@Auth("ORGANIZER")
export class SubstituteProposalsController {
  constructor(private readonly substitutes: SubstitutesService) {}

  @Get()
  @ApiOperation({
    summary:
      "Free beds of the event's terms with the first substitute they are proposed to, for the organizer's notice (US-31)",
  })
  @ApiResponse({ status: 200, type: [SubstituteProposalDto] })
  @ApiResponse({ status: 403, description: "Wrong account type or foreign event" })
  async list(
    @User() user: Identity,
    @Param("eventId") eventId: string,
  ): Promise<SubstituteProposalDto[]> {
    return (await this.substitutes.proposals(user, eventId)).map((proposal) =>
      SubstituteProposalDto.fromDomain(proposal),
    )
  }
}
