import type { Locale } from "@/core/email/locale"
import type { ReactNode } from "react"
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "react-email"

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
  "block box-border min-h-[44px] w-full rounded-lg bg-accent px-4 py-3 text-center text-sm font-medium leading-5 text-white"

export function EmailAction({ children, href, secondary=false, first=false }: { children: string; href: string; secondary?: boolean; first?: boolean }) {
  const secondaryButton = "block box-border min-h-[44px] w-full rounded-lg border border-solid border-[#759398] bg-white px-4 py-3 text-center text-sm font-medium leading-5 text-ink"
  return <Section className={first ? undefined : "mt-6"}><Button href={href} className={secondary ? secondaryButton : emailButton}>{children}</Button></Section>
}

export function ApplicationEmailFooter({locale, organization, contact="organizator@togena.com"}: {locale: Locale; organization:string; contact?:string}) {
  return <EmailFooter contact={locale === "cs" ? `Dotazy k přihlášce, účasti nebo platbě: ${contact}` : `Questions about your application, attendance or payment: ${contact}`}>
    {locale === "cs" ? `${organization} · prostřednictvím Togeny` : `${organization} · via Togena`}
  </EmailFooter>
}

export function EmailTerm({ dates, name, tone, badge, description, last }: {
  dates: string; name?: string; tone: "neutral" | "confirmed" | "waitlisted"; badge:string; description:string; last:boolean
}) {
  const tones = {
    neutral: "bg-[#f5f9fa] text-muted",
    confirmed: "bg-[#eaf6f0] text-[#16634a]",
    waitlisted: "bg-[#f4efff] text-[#6941a5]",
  }
  return <Section className={`py-4 ${last ? "" : "border-b border-solid border-line"}`}>
    <Row><Column className="email-term-name">
      <Text className="m-0 text-[18px] font-semibold leading-[26px] tracking-[-0.18px] text-ink">{dates}</Text>
      {name ? <Text className="mb-0 mt-0.5 text-xs font-medium leading-[18px] text-muted">{name}</Text> : null}
    </Column>
    <Column align="right" className="email-term-badge"><span className={`inline-block whitespace-nowrap rounded-full px-2 py-[5px] text-xs font-medium leading-[18px] ${tones[tone]}`}>{badge}</span></Column>
    </Row>
    <Text className="mb-0 mt-2 text-sm leading-5 text-muted">{description}</Text>
  </Section>
}

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
  const values = [eventName, participant, term]
  return (
    <EmailRows
      rows={values.flatMap((value, index) => (value ? [{ label: labels[index], value }] : []))}
    />
  )
}

export function EmailRows({
  rows,
  spaced = false,
}: {
  rows: { label: string; value: string }[]
  spaced?: boolean
}) {
  return (
    <Section className={`border-y border-solid border-line py-4 ${spaced ? "mt-6" : ""}`}>
      {rows.map(({ label, value }, index) => (
        <Section
          key={index}
          className={index === 0 ? "" : "mt-3"}
        >
          <Text className="m-0 text-xs font-medium leading-[18px] text-muted">{label}</Text>
          <Text className="mb-0 mt-0.5 text-base leading-6 text-ink">{value}</Text>
        </Section>
      ))}
    </Section>
  )
}

export function EmailFooter({ children, contact }: { children: ReactNode; contact?: string }) {
  return (
    <Section className="mt-6 border-t border-solid border-line pt-4">
      <Text className="m-0 text-xs font-medium leading-[18px] text-muted">{children}</Text>
      {contact ? (
        <Text className="mb-0 mt-1 text-xs font-medium leading-[18px] text-muted">{contact}</Text>
      ) : null}
    </Section>
  )
}
function EmailWarning({ title, children }: { title: string; children: string }) {
  const frontendUrl = process.env.FRONTEND_URL
  return (
    <Section className="rounded-xl border border-solid border-warning bg-warningSurface p-4">
      <Row>
        {frontendUrl ? (
          <Column width={32}>
            <Img
              src={new URL("/email/alert.png", frontendUrl).href}
              width={20}
              height={20}
              alt=""
            />
          </Column>
        ) : null}
        <Column>
          <Text className="m-0 text-sm font-semibold leading-5 text-warning">{title}</Text>
          <Text className="mb-0 mt-1 text-sm leading-5 text-warning">
            {children}
          </Text>
        </Column>
      </Row>
    </Section>
  )
}

export function EmailFallbackLink({ url, label }: { url: string; label: string }) {
  return (
    <Section className="mt-6">
      <Text className="m-0 text-xs font-medium leading-[18px] text-muted">{label}</Text>
      <Link
        href={url}
        className="mt-1 block text-xs font-medium leading-[18px] text-link"
        style={{ wordBreak: "break-all" }}
      >
        {url}
      </Link>
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

/** E17–E20 share the order of the security warning, fallback link and account contact. */
export function AccountEmail({
  locale,
  preview,
  heading,
  introduction,
  action,
  warningTitle,
  warning,
}: {
  locale: Locale
  preview: string
  heading: string
  introduction: string
  action?: { url: string; label: string; validity?: string }
  warningTitle: string
  warning: string
}) {
  const fallback =
    locale === "cs"
      ? "Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:"
      : "If the button does not work, copy this link into your browser:"
  const contact =
    locale === "cs"
      ? "Pomoc s přihlášením nebo uživatelským účtem: support@togena.com"
      : "Help with signing in or your account: support@togena.com"
  return (
    <EmailLayout
      locale={locale}
      preview={preview}
      heading={heading}
      introduction={<Text className="mb-0 mt-6 text-base leading-6 text-ink">{introduction}</Text>}
    >
      {action ? (
        <Section className="mb-6">
          <Button
            className={emailButton}
            href={action.url}
          >
            {action.label}
          </Button>
          {action.validity ? (
            <Text className="mb-0 mt-6 text-sm leading-5 text-muted">{action.validity}</Text>
          ) : null}
        </Section>
      ) : null}
      <EmailWarning title={warningTitle}>{warning}</EmailWarning>
      {action ? (
        <EmailFallbackLink
          url={action.url}
          label={fallback}
        />
      ) : null}
      <EmailFooter contact={contact}>Togena</EmailFooter>
    </EmailLayout>
  )
}

// Stable public URLs allow previously delivered messages to load the same fonts after a deployment.
function emailFontFaces(frontendUrl: string): string {
  const face = (subset: string, range: string) =>
    `@font-face{font-family:Inter;font-style:normal;font-weight:100 900;src:local("Inter Variable"),url("${new URL(`/email/inter-${subset}-wght-normal.woff2`, frontendUrl).href}") format("woff2");unicode-range:${range}}`
  return [
    face(
      "latin-ext",
      "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
    ),
    face(
      "latin",
      "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    ),
  ].join("\n")
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
          {frontendUrl ? <style>{emailFontFaces(frontendUrl)}</style> : null}
          <style>{`@media (max-width:480px){.email-gutter{padding:16px!important}.email-content{padding:24px!important}.email-heading{font-size:24px!important;line-height:32px!important}.email-term-name,.email-term-badge{display:block!important;width:100%!important}.email-term-badge{padding-top:8px!important;text-align:left!important}}`}</style>
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
                      boxShadow:
                        "0 1px 2px -1px rgba(20,52,59,0.06), 0 1px 3px rgba(20,52,59,0.08)",
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
                            style={{ padding: 32, overflowWrap: "anywhere" }}
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
                            <Heading className="email-heading mb-0 mt-6 text-[24px] font-semibold leading-8 tracking-[-0.36px] text-ink">
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
