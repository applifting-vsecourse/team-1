import { AccountType } from '@/shared/auth/domain/identity';

export type OrganizationSummary = {
  id: string;
  name: string;
};

export type Account = {
  id: string;
  email: string;
  name: string | null;
  accountType: AccountType;
  mustSetPassword: boolean;
  /** Organizations an organizer acts for; empty for other account types. */
  organizations: OrganizationSummary[];
};
