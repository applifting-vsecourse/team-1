import { User } from '@/generated/prisma/client';
import { AccountType } from '@/shared/auth/domain/identity';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';

// What BetterAuth 1.7 stamps on e-mail + password accounts and matches on when
// signing in (`createLocalAccountIssuer('credential')` in @better-auth/core).
const CREDENTIAL_ISSUER = 'local:credential';

type CreateUserParams = {
  email: string;
  /** Omit for an account that can only sign in once a password is set. */
  password?: string;
  name: string;
  accountType: AccountType;
  mustSetPassword?: boolean;
};

/**
 * Public sign-up is disabled (nobody registers in sprint 1), so accounts are
 * created the way BetterAuth's own sign-up does it — user row plus a
 * "credential" account with the hashed password — through its internal adapter.
 * No verification e-mail is sent; seeded e-mails count as verified.
 */
export async function createUser(
  auth: BetterAuth,
  params: CreateUserParams,
): Promise<User> {
  const {
    email,
    password,
    name,
    accountType,
    mustSetPassword = false,
  } = params;
  const context = await auth.$context;

  const user = (await context.internalAdapter.createUser(
    { email, name, emailVerified: true, accountType, mustSetPassword },
    { method: 'email-password' },
  )) as User;

  if (password) {
    await context.internalAdapter.linkAccount({
      userId: user.id,
      providerId: 'credential',
      issuer: CREDENTIAL_ISSUER,
      accountId: user.id,
      password: await context.password.hash(password),
    });
  }

  return user;
}
