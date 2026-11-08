import * as React from "react"
import { prerender } from "react-dom/static"
import { Locale, LOCALES } from "./locale"
import ApplicationChange, { applicationChangeSubject } from "./templates/application-change"
import ConfirmationWithdrawn, {
  confirmationWithdrawnSubject,
} from "./templates/application-change-confirmation-withdrawn"
import ApplicationConfirmation, {
  applicationConfirmationSubject,
} from "./templates/application-confirmation"
import TermCancelled, { termCancelledSubject } from "./templates/application-term-cancelled"
import ChangeEmail, { changeEmailSubject } from "./templates/change-email"
import ChangeEmailNotice, { changeEmailNoticeSubject } from "./templates/change-email-notice"
import MagicLink, { magicLinkSubject } from "./templates/magic-link"
import PaymentCorrectionEmail, { paymentCorrectionSubject } from "./templates/payment-correction"
import PaymentReceivedEmail, { paymentReceivedSubject } from "./templates/payment-received"
import ResetPassword, { resetPasswordSubject } from "./templates/reset-password"
import VerifyEmail, { verifyEmailSubject } from "./templates/verify-email"

// @react-email/render needs --experimental-vm-modules under jest, so the plain React renderer is used.
const render = async (element: React.ReactElement): Promise<string> => {
  const { prelude } = await prerender(element)
  return (await new Response(prelude).text()).replace(/<!-- -->/g, "")
}

const templates: Record<
  string,
  (locale: Locale) => { subject: string; element: React.ReactElement }
> = {
  "application-confirmation": (locale) => ({
    subject: applicationConfirmationSubject(locale, "Camp"),
    element: React.createElement(ApplicationConfirmation, {
      ...ApplicationConfirmation.PreviewProps,
      locale,
    }),
  }),
  "application-change": (locale) => ({
    subject: applicationChangeSubject(locale, "Camp"),
    element: React.createElement(ApplicationChange, { ...ApplicationChange.PreviewProps, locale }),
  }),
  "application-change-confirmation-withdrawn": (locale) => ({
    subject: confirmationWithdrawnSubject(locale, "Camp"),
    element: React.createElement(ConfirmationWithdrawn, {
      ...ConfirmationWithdrawn.PreviewProps,
      locale,
    }),
  }),
  "application-term-cancelled": (locale) => ({
    subject: termCancelledSubject(locale, "Camp"),
    element: React.createElement(TermCancelled, { ...TermCancelled.PreviewProps, locale }),
  }),
  "payment-correction": (locale) => ({
    subject: paymentCorrectionSubject(locale, "Camp"),
    element: React.createElement(PaymentCorrectionEmail, {
      ...PaymentCorrectionEmail.PreviewProps,
      locale,
    }),
  }),
  "payment-received": (locale) => ({
    subject: paymentReceivedSubject(locale, "Term"),
    element: React.createElement(PaymentReceivedEmail, {
      ...PaymentReceivedEmail.PreviewProps,
      locale,
    }),
  }),
  "magic-link": (locale) => ({
    subject: magicLinkSubject(locale),
    element: React.createElement(MagicLink, { url: "https://example.com/l", locale }),
  }),
  "reset-password": (locale) => ({
    subject: resetPasswordSubject(locale),
    element: React.createElement(ResetPassword, {
      username: "Petra",
      url: "https://example.com/r",
      locale,
    }),
  }),
  "change-email": (locale) => ({
    subject: changeEmailSubject(locale),
    element: React.createElement(ChangeEmail, { ...ChangeEmail.PreviewProps, locale }),
  }),
  "change-email-notice": (locale) => ({
    subject: changeEmailNoticeSubject(locale),
    element: React.createElement(ChangeEmailNotice, { ...ChangeEmailNotice.PreviewProps, locale }),
  }),
  "verify-email": (locale) => ({
    subject: verifyEmailSubject(locale),
    element: React.createElement(VerifyEmail, { url: "https://example.com/v", locale }),
  }),
}

describe.each(Object.keys(templates))("template %s", (name) => {
  it("renders subject and body per locale, the texts differ and <html lang> matches", async () => {
    const rendered = await Promise.all(
      LOCALES.map(async (locale) => {
        const { subject, element } = templates[name](locale)
        return { locale, subject, html: await render(element) }
      }),
    )

    for (const { locale, subject, html } of rendered) {
      expect(subject.length).toBeGreaterThan(0)
      expect(html.length).toBeGreaterThan(0)
      expect(html).toMatch(new RegExp(`<html[^>]* lang="${locale}"`))
    }
    const [first, ...rest] = rendered
    for (const other of rest) {
      expect(other.subject).not.toBe(first.subject)
      expect(other.html).not.toBe(first.html)
    }
  })
})

it("includes the corrected debt and transfer details in e-mail 16", async () => {
  const html = await render(
    React.createElement(PaymentCorrectionEmail, {
      ...PaymentCorrectionEmail.PreviewProps,
      debts: [
        {
          termNumber: 1,
          amountCzk: 1200,
          variableSymbol: "12345001",
          paymentDueAt: new Date("2027-06-20T12:00:00Z"),
        },
        { termNumber: 2, amountCzk: 500, variableSymbol: "12345002", paymentDueAt: null },
      ],
    }),
  )
  expect(html).toContain("Aktuální nedoplatek")
  expect(html).toMatch(/1[\s\u00a0\u202f]200/)
  expect(html).toContain("123456789/2010")
  expect(html).toContain("12345001")
  expect(html).toContain("12345002")
  expect(html).toContain("Zaplaťte do")
  expect(html).toContain("20. června 2027")
})

it("tells the participant the confirmed, substitute and awaiting-evaluation results of changed terms", async () => {
  const terms = [
    { name: "First", status: "CONFIRMED" as const },
    { name: "Second", status: "WAITLISTED" as const },
    { name: "Third", status: "TO_EVALUATE" as const },
  ]
  const [en, cs] = await Promise.all(
    LOCALES.map((locale) =>
      render(
        React.createElement(ApplicationChange, {
          ...ApplicationChange.PreviewProps,
          locale,
          kind: "TERMS_CHANGED",
          terms,
          payment: null,
        }),
      ),
    ),
  )
  for (const html of [en, cs]) {
    for (const term of terms) expect(html).toContain(term.name)
  }
  expect(en).toContain("Substitute · do not pay yet")
  expect(en).toContain("Confirmed")
  expect(en).not.toContain("payment due")
  expect(en).toContain("Awaiting evaluation · do not pay yet")
  expect(cs).toContain("Účast potvrzena")
  expect(cs).not.toContain("k úhradě")
  expect(cs).toContain("Náhradník · zatím neplaťte")
  expect(cs).toContain("Čeká na vyhodnocení · zatím neplaťte")
})
