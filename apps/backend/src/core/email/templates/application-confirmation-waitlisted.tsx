import * as React from 'react';
import {
  ApplicationConfirmation,
  ApplicationConfirmationProps,
} from './application-confirmation';

// Preview for `pnpm backend email:dev`: waitlisted in every term — no
// payment details, the e-mail explains that you pay once a place is confirmed.
const props = {
  locale: 'cs',
  eventName: 'Horský víkend 2027',
  access: {
    kind: 'MAGIC_LINK',
    url: 'https://team-1.vsepractical.applifting.dev/participant/magic-link?token=preview',
  },
  applications: [
    {
      name: 'Hana Králová',
      terms: [{ name: 'Září', status: 'WAITLISTED' }],
      payment: null,
      confirmationUrl:
        'https://team-1.vsepractical.applifting.dev/apply/confirmation/preview-3',
    },
  ],
} satisfies ApplicationConfirmationProps;

const Waitlisted = (): React.JSX.Element => <ApplicationConfirmation {...props} />;
Waitlisted.PreviewProps = {};

export default Waitlisted;
