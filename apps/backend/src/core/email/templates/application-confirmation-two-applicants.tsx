import * as React from 'react';
import {
  ApplicationConfirmation,
  ApplicationConfirmationProps,
} from './application-confirmation';

// Preview for `pnpm backend email:dev`: two participants, existing account
// (link to the sign-in), mixed statuses, each application with its own symbol.
const props = {
  locale: 'en',
  eventName: 'Summer camp 2027',
  access: {
    kind: 'LOGIN',
    url: 'https://team-1.vsepractical.applifting.dev/participant/login',
  },
  applications: [
    {
      name: 'Jana Nováková',
      terms: [
        { name: 'Week 1', status: 'CONFIRMED' },
        { name: 'Week 2', status: 'CONFIRMED' },
      ],
      payment: {
        amount: 'CZK 9,400',
        bankAccount: '2900123456/2010',
        variableSymbol: '48000',
        terms: [
          { name: 'Week 1', amount: 'CZK 4,500', variableSymbol: '48001' },
          { name: 'Week 2', amount: 'CZK 4,900', variableSymbol: '48002' },
        ],
      },
      confirmationUrl:
        'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-1',
    },
    {
      name: 'Petr Novák',
      terms: [
        { name: 'Week 1', status: 'WAITLISTED' },
        { name: 'Week 2', status: 'CONFIRMED' },
      ],
      payment: {
        amount: 'CZK 4,900',
        bankAccount: '2900123456/2010',
        variableSymbol: '49000',
        terms: [],
      },
      confirmationUrl:
        'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-2',
    },
  ],
} satisfies ApplicationConfirmationProps;

const TwoApplicants = (): React.JSX.Element => <ApplicationConfirmation {...props} />;
TwoApplicants.PreviewProps = {};

export default TwoApplicants;
