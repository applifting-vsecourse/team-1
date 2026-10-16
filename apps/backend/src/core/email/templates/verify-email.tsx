import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email';
import * as React from 'react';

export interface VerifyEmailProps {
  url: string;
}

export const VerifyEmail = ({ url }: VerifyEmailProps): React.JSX.Element => (
  <Html lang="cs">
    <Head />
    <Preview>Ověř svůj e-mail pro Togenu</Preview>
    <Tailwind>
      <Body className="bg-gray-50 font-sans py-10">
        <Container className="bg-white rounded-lg mx-auto p-8 max-w-xl">
          <Heading className="text-2xl font-bold text-gray-900 m-0">
            Vítej v Togeně
          </Heading>
          <Text className="text-gray-700 text-base leading-6 mt-4">
            Kliknutím na tlačítko níže ověříš svou e-mailovou adresu a dokončíš
            založení účtu.
          </Text>
          <Section className="text-center my-8">
            <Button
              href={url}
              className="bg-gray-900 text-white font-semibold rounded-md px-6 py-3"
            >
              Ověřit e-mail
            </Button>
          </Section>
          <Text className="text-gray-600 text-sm leading-5">
            Pokud tlačítko nefunguje, zkopíruj tento odkaz do prohlížeče:
          </Text>
          <Text className="text-blue-600 text-sm break-all">{url}</Text>
          <Hr className="border-gray-200 my-6" />
          <Text className="text-gray-400 text-xs">
            Pokud sis účet v Togeně nezakládal(a), tento e-mail ignoruj.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default VerifyEmail;
