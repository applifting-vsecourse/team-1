import { ParticipantTermChangeRequestDto } from "@/modules/applications/controllers/dto/participant-term-change.dto"
import { ChangeRequest } from "@/modules/applications/domain/change-request"
import { ChangeRequestService } from "@/modules/applications/services/change-request.service"
import { HEALTH_NOTE_MAX_LENGTH } from "@/modules/health/domain/health"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common"
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator"

class RejectRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string
}

@Controller("participant/applications/:applicationId/change-requests")
@Auth("PARTICIPANT")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ParticipantChangeRequestController {
  constructor(private readonly requests: ChangeRequestService) {}

  @Get()
  list(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
  ): Promise<ChangeRequest[]> {
    return this.requests.forParticipant(user, applicationId)
  }

  @Post()
  submit(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Body() body: ParticipantTermChangeRequestDto,
  ): Promise<ChangeRequest> {
    return this.requests.submit(user, applicationId, body.termIds)
  }
}

class HealthChangeRequestDto {
  @IsString()
  @MaxLength(HEALTH_NOTE_MAX_LENGTH)
  note!: string

  @IsBoolean()
  consent!: boolean
}

@Controller("participant/applications/:applicationId/health-change-requests")
@Auth("PARTICIPANT")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ParticipantHealthChangeRequestController {
  constructor(private readonly requests: ChangeRequestService) {}

  @Post()
  submit(
    @User() user: Identity,
    @Param("applicationId") applicationId: string,
    @Body() body: HealthChangeRequestDto,
  ): Promise<ChangeRequest> {
    return this.requests.submitHealth(user, applicationId, body)
  }
}

@Controller("participant/change-request-notifications")
@Auth("PARTICIPANT")
export class ParticipantChangeRequestNotificationsController {
  constructor(private readonly requests: ChangeRequestService) {}

  @Get()
  list(@User() user: Identity): ReturnType<ChangeRequestService["notificationsForParticipant"]> {
    return this.requests.notificationsForParticipant(user)
  }

  @Patch(":requestId/read")
  @HttpCode(204)
  markRead(@User() user: Identity, @Param("requestId") requestId: string): Promise<void> {
    return this.requests.markNotificationRead(user, requestId)
  }
}

@Controller("organizer/events/:eventId/change-requests")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class OrganizerChangeRequestController {
  constructor(private readonly requests: ChangeRequestService) {}

  @Get()
  list(@User() user: Identity, @Param("eventId") eventId: string): Promise<ChangeRequest[]> {
    return this.requests.pendingForEvent(user, eventId)
  }

  @Get(":requestId")
  get(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("requestId") requestId: string,
  ): Promise<ChangeRequest> {
    return this.requests.forOrganizer(user, eventId, requestId)
  }

  @Patch(":requestId/approve")
  @HttpCode(204)
  approve(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("requestId") requestId: string,
  ): Promise<void> {
    return this.requests.approve(user, eventId, requestId)
  }

  @Patch(":requestId/reject")
  @HttpCode(204)
  reject(
    @User() user: Identity,
    @Param("eventId") eventId: string,
    @Param("requestId") requestId: string,
    @Body() body: RejectRequestDto,
  ): Promise<void> {
    return this.requests.reject(user, eventId, requestId, body.reason ?? "")
  }
}
