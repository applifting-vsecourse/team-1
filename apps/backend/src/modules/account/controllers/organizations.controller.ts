import {
  CreateOrganizationDto,
  UpdateOrganizationProfileDto,
} from "@/modules/account/controllers/dto/organization.request.dto"
import { OrganizationProfileResponseDto } from "@/modules/account/controllers/dto/organization.response.dto"
import { OrganizationsService } from "@/modules/account/services/organizations.service"
import { Auth } from "@/shared/auth/decorators/auth.decorator"
import { User } from "@/shared/auth/decorators/user.decorator"
import { Identity } from "@/shared/auth/domain/identity"
import { Body, Controller, Get, Param, Post, Put, UsePipes, ValidationPipe } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

@ApiTags("organizations")
@Controller("organizer/organizations")
@Auth("ORGANIZER")
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: "Create the signed-in organizer's first organization" })
  @ApiResponse({ status: 201, type: OrganizationProfileResponseDto })
  async create(
    @User() user: Identity,
    @Body() body: CreateOrganizationDto,
  ): Promise<OrganizationProfileResponseDto> {
    return OrganizationProfileResponseDto.fromDomain(
      await this.organizations.create(user, body.name),
    )
  }

  @Get(":organizationId")
  @ApiOperation({ summary: "Organization profile of a member" })
  @ApiResponse({ status: 200, type: OrganizationProfileResponseDto })
  async get(
    @User() user: Identity,
    @Param("organizationId") organizationId: string,
  ): Promise<OrganizationProfileResponseDto> {
    return OrganizationProfileResponseDto.fromDomain(
      await this.organizations.get(user, organizationId),
    )
  }

  @Put(":organizationId/profile")
  @ApiOperation({ summary: "Complete the organization's contact and bank details" })
  @ApiResponse({ status: 200, type: OrganizationProfileResponseDto })
  async updateProfile(
    @User() user: Identity,
    @Param("organizationId") organizationId: string,
    @Body() body: UpdateOrganizationProfileDto,
  ): Promise<OrganizationProfileResponseDto> {
    return OrganizationProfileResponseDto.fromDomain(
      await this.organizations.updateProfile(user, organizationId, body),
    )
  }
}
