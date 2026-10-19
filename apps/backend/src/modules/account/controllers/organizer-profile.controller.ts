import { MeResponseDto } from '@/modules/account/controllers/dto/me.response.dto';
import { AccountService } from '@/modules/account/services/account.service';
import { Auth } from '@/shared/auth/decorators/auth.decorator';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('account')
@Controller('organizer/profile')
@Auth('ORGANIZER')
export class OrganizerProfileController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  @ApiOperation({
    summary:
      'The signed-in organizer — the organizer area is closed to other account types',
  })
  @ApiResponse({ status: 200, type: MeResponseDto })
  async profile(@User() user: Identity): Promise<MeResponseDto> {
    const account = await this.accountService.getAccount(user);
    return MeResponseDto.fromDomain(account);
  }
}
