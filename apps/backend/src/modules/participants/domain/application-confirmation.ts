import { ApplicationTermStatus } from '@/modules/applications/domain/evaluation';

/** Everything the confirmation e-mail shows (US-56 = same data as US-25). */
export type ApplicationConfirmation = {
  email: string;
  firstName: string;
  eventName: string;
  /** Variable symbol. */
  applicationNumber: number;
  accessToken: string;
  bankAccount: string;
  amountDueCzk: number;
  terms: { name: string; status: ApplicationTermStatus }[];
};
