import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email"
import type { ReactNode } from "react"

import type { Locale } from "@/core/email/locale"

// Figma v2 · transactional email, desktop and mobile · https://www.figma.com/design/6MuZPIqmrziZoZwyqEKsyK/Design-system-v2?node-id=19681-1461 (mobile 19681-1491).
const colors = {
  canvas: "#f9fdff",
  ink: "#031a1e",
  muted: "#50686d",
  accent: "#007f72",
  line: "#dae3e4",
  surface: "#f4f8f9",
  link: "#006363",
  warning: "#8a4b0e",
  warningSurface: "#fff5e6",
  positive: "#e8f5ee",
}

export const emailButton =
  "block box-border w-full rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold leading-5 text-white"

/** E05–E16 identification rows between the introduction and the action. */
export function EmailIdentification({
  locale,
  eventName,
  participant,
  term,
}: {
  locale: Locale
  eventName: string
  participant?: string
  term?: string
}) {
  const labels = locale === "cs" ? ["Akce", "Účastník", "Termín"] : ["Event", "Participant", "Term"]
  return (
    <Section className="border-y border-solid border-line py-4">
      {[eventName, participant, term].map((value, index) =>
        value ? (
          <Section
            key={labels[index]}
            className={index === 0 ? "" : "mt-3"}
          >
            <Text className="m-0 text-xs font-medium leading-[18px] text-muted">
              {labels[index]}
            </Text>
            <Text className="mb-0 mt-0.5 text-base leading-6 text-ink">{value}</Text>
          </Section>
        ) : null,
      )}
    </Section>
  )
}
export function EmailFooter({ children }: { children: ReactNode }) {
  return (
    <Section className="mt-6 border-t border-solid border-line pt-4">
      <Text className="m-0 text-xs font-medium leading-[18px] text-muted">{children}</Text>
    </Section>
  )
}
export function EmailLinkHelp({
  url,
  fallback,
  warning,
}: {
  url: string
  fallback: string
  warning: string
}) {
  return (
    <>
      <Text className="mt-6 rounded-lg border border-solid border-warning bg-warningSurface p-4 text-sm leading-5 text-warning">
        {warning}
      </Text>
      <Text className="mb-0 mt-6 text-xs leading-[18px] text-muted">{fallback}</Text>
      <Link
        href={url}
        className="text-xs leading-[18px] text-link underline"
        style={{ wordBreak: "break-all" }}
      >
        {url}
      </Link>
      <EmailFooter>Togena</EmailFooter>
    </>
  )
}

export function EmailLayout({
  locale,
  preview,
  heading,
  introduction,
  children,
}: {
  locale: Locale
  preview: string
  heading: string
  introduction: ReactNode
  children: ReactNode
}) {
  const frontendUrl = process.env.FRONTEND_URL
  return (
    <Html lang={locale}>
      <Tailwind config={{ theme: { extend: { colors } } }}>
        <Head>
          <style>{`@media (max-width:480px){.email-gutter{padding:16px!important}.email-content{padding:24px!important}.email-heading{font-size:24px!important;line-height:32px!important}}`}</style>
        </Head>
        <Preview>{preview}</Preview>
        <Body
          lang={locale}
          style={{
            margin: 0,
            backgroundColor: colors.canvas,
            color: colors.ink,
            fontFamily: "Inter, Arial, sans-serif",
          }}
        >
          <table
            role="presentation"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
          >
            <tbody>
              <tr>
                <td
                  className="email-gutter"
                  style={{ padding: "48px 16px" }}
                >
                  <Container
                    style={{
                      width: "100%",
                      maxWidth: 640,
                      backgroundColor: "#ffffff",
                      border: `1px solid ${colors.line}`,
                      borderRadius: 12,
                      boxShadow: "0 1px 3px rgba(20,52,59,0.08)",
                    }}
                  >
                    <table
                      role="presentation"
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                    >
                      <tbody>
                        <tr>
                          <td
                            className="email-content"
                            style={{ padding: 32 }}
                          >
                            {frontendUrl ? (
                              <Img
                                src={new URL("/email/togena.png", frontendUrl).href}
                                width={155}
                                height={40}
                                alt="Togena"
                              />
                            ) : (
                              <Text className="m-0 text-3xl font-semibold text-ink">togena</Text>
                            )}
                            <Heading className="email-heading mb-0 mt-6 text-[24px] font-semibold leading-8 text-ink">
                              {heading}
                            </Heading>
                            {introduction}
                            <Hr
                              style={{
                                border: 0,
                                borderTop: `2px solid ${colors.accent}`,
                                margin: "24px 0",
                              }}
                            />
                            {children}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </Container>
                </td>
              </tr>
            </tbody>
          </table>
        </Body>
      </Tailwind>
    </Html>
  )
}
