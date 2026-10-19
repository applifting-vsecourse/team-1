import { Locale } from '@/core/email/locale';
import { AccountType } from '@/shared/auth/domain/identity';

/** A user as `ensureAccount` needs to see it — no Prisma or BetterAuth types. */
export type ParticipantAccount = {
  id: string;
  accountType: AccountType;
  mustSetPassword: boolean;
};

export type NewParticipantAccount = {
  email: string;
  name: string;
  locale: Locale;
};
