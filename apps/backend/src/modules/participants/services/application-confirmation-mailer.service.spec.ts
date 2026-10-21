import { EmailService } from "@/core/email/interfaces/email-service.interface"
import {
  ApplicationChange,
  SubmissionConfirmation,
  SubmittedApplication,
} from "@/modules/participants/domain/submission-confirmation"
import { MagicLinkService } from "@/shared/auth/services/magic-link.service"
import { Config } from "@/shared/config/config.service"
import { Logger } from "@nestjs/common"
import * as React from "react"
import { prerender } from "react-dom/static"
import { ApplicationConfirmationMailer } from "./application-confirmation-mailer.service"

// @react-email/render loads its renderer with a dynamic import that jest cannot
// run without --experimental-vm-modules; the templates themselves are plain React.
jest.mock("@/core/email/render", () => ({
  // `prerender` waits for the Tailwind wrapper, which suspends on its first render.
  renderEmail: async <T extends object>(
    Component: React.ComponentType<T>,
    props: T,
  ): Promise<string> => {
    const { prelude } = await prerender(React.createElement(Component, props))
    return new Response(prelude).text()
  },
}))

const FRONTEND = "https://app.example.test"
const MAGIC_LINK = `${FRONTEND}/participant/magic-link?token=abc`

/** Non-breaking spaces and React's text separators `<!-- -->` would break plain comparisons. */
const plain = (text: string): string =>
  text
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/<!-- -->/g, "")

const application = (overrides: Partial<SubmittedApplication> = {}): SubmittedApplication => ({
  number: 48,
  firstName: "Jana",
  lastName: "Nováková",
  accessToken: "token-48",
  terms: [
    { name: "1. týden", status: "CONFIRMED", priceCzk: 4500 },
    { name: "2. týden", status: "CONFIRMED", priceCzk: 4900 },
  ],
  ...overrides,
})

const confirmation = (overrides: Partial<SubmissionConfirmation> = {}): SubmissionConfirmation => ({
  email: "petra@example.com",
  locale: "cs",
  eventName: "Letní kemp 2027",
  bankAccount: "2900123456/2010",
  mustSetPassword: true,
  applications: [application()],
  ...overrides,
})

const waitlisted = (overrides: Partial<SubmittedApplication> = {}): SubmittedApplication =>
  application({
    terms: [{ name: "Září", status: "WAITLISTED", priceCzk: 1800 }],
    ...overrides,
  })

const setup = (
  options: { link?: string | null; sendError?: Error } = {},
): {
  mailer: ApplicationConfirmationMailer
  sendEmail: jest.Mock
  createLink: jest.Mock
} => {
  const sendEmail = jest.fn(() =>
    options.sendError ? Promise.reject(options.sendError) : Promise.resolve(),
  )
  const createLink = jest.fn(() =>
    Promise.resolve(options.link === undefined ? MAGIC_LINK : options.link),
  )
  const mailer = new ApplicationConfirmationMailer(
    { sendEmail } as unknown as EmailService,
    { createLink } as unknown as MagicLinkService,
    { frontendUrl: FRONTEND } as unknown as Config,
  )
  return { mailer, sendEmail, createLink }
}

/** Subject and body of the one e-mail that went out. */
const sent = (sendEmail: jest.Mock): { to: string; subject: string; html: string } => {
  expect(sendEmail).toHaveBeenCalledTimes(1)
  const [to, subject, html] = sendEmail.mock.calls[0] as [string, string, string]
  return { to, subject, html: plain(html) }
}

describe("ApplicationConfirmationMailer.sendSubmissionConfirmation", () => {
  afterEach(() => jest.restoreAllMocks())

  it("sends exactly one e-mail for one participant", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendSubmissionConfirmation(confirmation())

    const email = sent(sendEmail)
    expect(email.to).toBe("petra@example.com")
    expect(email.subject).toBe("Potvrzení přihlášky: Letní kemp 2027")
    expect(email.html).toContain("Letní kemp 2027")
    expect(email.html).toContain("Jana Nováková")
  })

  it("sends still one e-mail for two participants, each with its own variable symbol and amount", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendSubmissionConfirmation(
      confirmation({
        applications: [
          application(),
          application({
            number: 49,
            firstName: "Petr",
            lastName: "Novák",
            accessToken: "token-49",
            terms: [{ name: "2. týden", status: "CONFIRMED", priceCzk: 4900 }],
          }),
        ],
      }),
    )

    const { html } = sent(sendEmail)
    expect(html).toContain("Jana Nováková")
    expect(html).toContain("Petr Novák")
    expect(html).toContain("0048")
    expect(html).toContain("0049")
    expect(html).toContain("9 400 Kč")
    expect(html).toContain("4 900 Kč")
    expect(html).toContain("platby posílejte zvlášť")
  })

  it("shows the status of every term and charges only the confirmed ones", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendSubmissionConfirmation(
      confirmation({
        applications: [
          application({
            terms: [
              { name: "1. týden", status: "CONFIRMED", priceCzk: 4500 },
              { name: "2. týden", status: "WAITLISTED", priceCzk: 4900 },
            ],
          }),
        ],
      }),
    )

    const { html } = sent(sendEmail)
    expect(html).toMatch(/1\. týden:\s*<strong>potvrzený/)
    expect(html).toMatch(/2\. týden:\s*<strong>náhradník/)
    expect(html).toContain("4 500 Kč")
    expect(html).not.toContain("9 400 Kč")
    expect(html).toContain("2900123456/2010")
    expect(html).toContain("Za termín, ve kterém jste náhradník, neplaťte")
  })

  it("leaves out the payment details when everyone is waitlisted in every term, and says why", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendSubmissionConfirmation(
      confirmation({
        applications: [waitlisted(), waitlisted({ number: 50, accessToken: "t50" })],
      }),
    )

    const { html } = sent(sendEmail)
    expect(html).not.toContain("Variabilní symbol")
    expect(html).not.toContain("2900123456/2010")
    expect(html).toContain("Platíte až po potvrzení místa")
  })

  it("shows payment details only for the application that has a confirmed term", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendSubmissionConfirmation(
      confirmation({
        applications: [application(), waitlisted({ number: 50, accessToken: "t50" })],
      }),
    )

    const { html } = sent(sendEmail)
    expect(html).toContain("0048")
    expect(html).not.toContain("0050")
  })

  it("links the magic link to an account without a password", async () => {
    const { mailer, sendEmail, createLink } = setup()

    await mailer.sendSubmissionConfirmation(confirmation({ mustSetPassword: true }))

    expect(createLink).toHaveBeenCalledWith("petra@example.com")
    expect(sent(sendEmail).html).toContain(MAGIC_LINK.replace(/&/g, "&amp;"))
  })

  it("links the sign-in page to an account with a password and issues no magic link", async () => {
    const { mailer, sendEmail, createLink } = setup()

    await mailer.sendSubmissionConfirmation(confirmation({ mustSetPassword: false }))

    expect(createLink).not.toHaveBeenCalled()
    const { html } = sent(sendEmail)
    expect(html).toContain(`${FRONTEND}/participant/login`)
    expect(html).not.toContain("magic-link")
  })

  it("falls back to the sign-in page and warns when no magic link can be issued", async () => {
    const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
    const { mailer, sendEmail } = setup({ link: null })

    await mailer.sendSubmissionConfirmation(confirmation({ mustSetPassword: true }))

    expect(sent(sendEmail).html).toContain(`${FRONTEND}/participant/login`)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it("links the confirmation page of every application", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendSubmissionConfirmation(
      confirmation({
        applications: [application(), application({ number: 49, accessToken: "token-49" })],
      }),
    )

    const { html } = sent(sendEmail)
    expect(html).toContain(`${FRONTEND}/apply/confirmation/token-48`)
    expect(html).toContain(`${FRONTEND}/apply/confirmation/token-49`)
  })

  it("writes the e-mail in English with English amounts when the application is English", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendSubmissionConfirmation(
      confirmation({ locale: "en", eventName: "Summer camp 2027" }),
    )

    const { subject, html } = sent(sendEmail)
    expect(subject).toBe("Your application: Summer camp 2027")
    expect(html).toContain("Application received")
    expect(html).toContain("CZK 9,400")
    expect(html).toContain("Variable symbol")
  })

  it("does not fail the caller when delivery fails, and logs only the recipient address", async () => {
    const error = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
    const { mailer } = setup({ sendError: new Error("Resend delivery failed") })

    await expect(mailer.sendSubmissionConfirmation(confirmation())).resolves.toBeUndefined()

    expect(error).toHaveBeenCalledTimes(1)
    const logged = String(error.mock.calls[0][0])
    expect(logged).toContain("petra@example.com")
    expect(logged).not.toContain("Nováková")
    expect(logged).not.toContain("2900123456")
  })

  it("does not fail the caller when the magic link cannot even be created", async () => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
    const { mailer, sendEmail, createLink } = setup()
    createLink.mockRejectedValue(new Error("db down"))

    await expect(mailer.sendSubmissionConfirmation(confirmation())).resolves.toBeUndefined()

    expect(sent(sendEmail).html).toContain(`${FRONTEND}/participant/login`)
  })
})

describe("ApplicationConfirmationMailer.sendApplicationChange", () => {
  afterEach(() => jest.restoreAllMocks())

  const change = (overrides: Partial<ApplicationChange> = {}): ApplicationChange => ({
    email: "petra@example.com",
    locale: "cs",
    eventName: "Letní kemp 2027",
    bankAccount: "2900123456/2010",
    kind: "STATUS_CHANGED",
    application: application({
      number: 49,
      firstName: "Petr",
      lastName: "Novák",
      accessToken: "token-49",
    }),
    isAmountChanged: false,
    ...overrides,
  })

  it("sends one e-mail about the change with the new status of the terms, without payment details", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendApplicationChange(change())

    const { to, subject, html } = sent(sendEmail)
    expect(to).toBe("petra@example.com")
    expect(subject).toBe("Změna ve vaší přihlášce: Letní kemp 2027")
    expect(html).toContain("Změnil se stav v jednom z termínů")
    expect(html).toMatch(/1\. týden:\s*<strong>potvrzený/)
    expect(html).not.toContain("Variabilní symbol")
    expect(html).toContain(`${FRONTEND}/apply/confirmation/token-49`)
  })

  it("repeats the payment details when the amount due changed", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendApplicationChange(change({ isAmountChanged: true, kind: "TERMS_CHANGED" }))

    const { html } = sent(sendEmail)
    expect(html).toContain("Změnily se termíny přihlášky")
    expect(html).toContain("9 400 Kč")
    expect(html).toContain("0049")
    expect(html).toContain("2900123456/2010")
  })

  it("shows no payment details for a cancelled application without confirmed terms", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendApplicationChange(
      change({ kind: "CANCELLED", isAmountChanged: true, application: waitlisted({ number: 49 }) }),
    )

    const { html } = sent(sendEmail)
    expect(html).toContain("Přihláška byla odhlášena")
    expect(html).not.toContain("Variabilní symbol")
  })

  it("writes the change e-mail in English when the application is English", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendApplicationChange(change({ locale: "en", isAmountChanged: true }))

    const { subject, html } = sent(sendEmail)
    expect(subject).toBe("Change in your application: Letní kemp 2027")
    expect(html).toContain("The status of one of the terms changed")
    expect(html).toContain("CZK 9,400")
  })

  it("does not fail the caller when delivery fails", async () => {
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
    const { mailer } = setup({ sendError: new Error("boom") })

    await expect(mailer.sendApplicationChange(change())).resolves.toBeUndefined()
  })
})
