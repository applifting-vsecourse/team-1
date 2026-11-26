import {
  ApplicationTransportResponseDto,
  ChooseTransportRequestDto,
} from "@/modules/transport/controllers/dto/transport.dto"
import { TransportService } from "@/modules/transport/services/transport.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Put,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

/** An organizer chooses the transport for the participant (D-191, #786), as the participant would. */
@ApiTags("transport")
@Auth("ORGANIZER")
@Controller("organizer/applications/:applicationId/transport")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiResponse({ status: 403, description: "Application of another organization" })
export class OrganizerApplicationTransportController {
  constructor(private readonly transport: TransportService) {}

  @Get()
  @ApiOperation({
    summary: "Transport offered in each active term of the application and the chosen one",
  })
  @ApiResponse({ status: 200, type: ApplicationTransportResponseDto })
  async get(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
  ): Promise<ApplicationTransportResponseDto> {
    return ApplicationTransportResponseDto.fromDomain(
      await this.transport.ofApplicationForOrganizer(user, applicationId),
    )
  }

  @Put()
  @HttpCode(204)
  @ApiOperation({ summary: "Choose or change the transport of the participant in one term" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, description: "TRANSPORT_EDIT_CLOSED: the term is over (D-192)" })
  async choose(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Body() body: ChooseTransportRequestDto,
  ): Promise<void> {
    await this.transport.chooseByOrganizer(user, applicationId, body.termId, body.transportId)
  }
}
