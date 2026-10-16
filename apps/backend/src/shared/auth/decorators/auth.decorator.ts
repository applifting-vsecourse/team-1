import { AccountType } from '@/shared/auth/domain/identity';
import {
  ACCOUNT_TYPES_KEY,
  AccountTypeGuard,
} from '@/shared/auth/guards/account-type.guard';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiResponse } from '@nestjs/swagger';

/**
 * Protects a controller or handler: no session → 401, wrong account type → 403.
 * With no arguments any signed-in user passes.
 *
 * @example
 * @Controller('organizer/events')
 * @Auth('ORGANIZER')
 * export class OrganizerEventsController {}
 */
export const Auth = (
  ...accountTypes: AccountType[]
): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SetMetadata(ACCOUNT_TYPES_KEY, accountTypes),
    UseGuards(AuthenticatedUserGuard, AccountTypeGuard),
    ApiCookieAuth(),
    ApiResponse({ status: 401, description: 'Not signed in' }),
    ApiResponse({ status: 403, description: 'Wrong account type' }),
  );
