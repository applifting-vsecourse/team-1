import * as React from "react"
import { prerender } from "react-dom/static"
import { Locale, LOCALES } from "./locale"
import ApplicationChange, { applicationChangeSubject } from "./templates/application-change"
import ApplicationConfirmation, {
  applicationConfirmationSubject,
} from "./templates/application-confirmation"
import MagicLink, { magicLinkSubject } from "./templates/magic-link"
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
