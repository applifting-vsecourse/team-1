import { Locale } from '@/core/email/locale';

export type AccountType = 'ORGANIZER' | 'PARTICIPANT' | 'ADMIN';

/** The signed-in user as the session carries it (`@User() user: Identity`). */
export class Identity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string | null,
    public readonly accountType: AccountType,
    public readonly mustSetPassword: boolean,
    public readonly locale: Locale = 'en',
  ) {}
}
