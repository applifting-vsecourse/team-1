import { AccountType } from '@/shared/auth/domain/identity';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountTypeGuard } from './account-type.guard';

const contextFor = (accountType?: AccountType): ExecutionContext =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({
        session: accountType ? { user: { accountType } } : undefined,
      }),
    }),
  }) as unknown as ExecutionContext;

const guardAllowing = (
  allowed: AccountType[] | undefined,
): AccountTypeGuard => {
  const reflector = {
    getAllAndOverride: () => allowed,
  } as unknown as Reflector;
  return new AccountTypeGuard(reflector);
};

describe('AccountTypeGuard', () => {
  it('lets the listed account type through', () => {
    expect(
      guardAllowing(['ORGANIZER']).canActivate(contextFor('ORGANIZER')),
    ).toBe(true);
  });

  it('rejects a participant on an organizer endpoint with 403', () => {
    expect(() =>
      guardAllowing(['ORGANIZER']).canActivate(contextFor('PARTICIPANT')),
    ).toThrow(ForbiddenException);
  });

  it('lets any signed-in user through when no type is listed', () => {
    expect(guardAllowing([]).canActivate(contextFor('PARTICIPANT'))).toBe(true);
    expect(guardAllowing(undefined).canActivate(contextFor('ADMIN'))).toBe(
      true,
    );
  });
});
