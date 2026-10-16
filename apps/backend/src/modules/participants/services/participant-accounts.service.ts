import { Injectable } from '@nestjs/common';

export type EnsureAccountInput = {
  email: string;
  name: string;
};

export type EnsureAccountResult = {
  /** Participant account the application is attached to; null until US-01. */
  userId: string | null;
  /** True when the account was created now (the e-mail then carries a magic link). */
  isNew: boolean;
};

/**
 * Contract between stream B (application) and stream C (accounts).
 * B calls `ensureAccount` inside the submit flow; C implements it in US-01:
 * find or create the PARTICIPANT account for the e-mail (mustSetPassword=true
 * for a new one), reject an organizer's e-mail. Until then it is a no-op so B
 * can be built and tested without waiting.
 */
@Injectable()
export class ParticipantAccountsService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async ensureAccount(input: EnsureAccountInput): Promise<EnsureAccountResult> {
    // TODO(US-01): create or find the participant account.
    return { userId: null, isNew: false };
  }
}
