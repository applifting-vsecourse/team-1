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

@ApiTags("transport")
@Auth("PARTICIPANT")
@Controller("participant/applications/:applicationId/transport")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiResponse({ status: 401, description: "Session required" })
@ApiResponse({
  status: 403,
  description: "Wrong account type or not the participant's application",
})
export class ParticipantTransportController {
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
      await this.transport.ofApplication(user, applicationId),
    )
  }

  @Put()
  @HttpCode(204)
  @ApiOperation({
    summary: "Choose the transport to one term of the application; null = own transport",
  })
  @ApiResponse({ status: 204 })
  async choose(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Body() body: ChooseTransportRequestDto,
  ): Promise<void> {
    await this.transport.choose(user, applicationId, body.termId, body.transportId ?? null)
  }
}
