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
    { name: "1. týden", termNumber: 1, status: "CONFIRMED", priceCzk: 4500 },
    { name: "2. týden", termNumber: 2, status: "CONFIRMED", priceCzk: 4900 },
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
    terms: [{ name: "Září", termNumber: 1, status: "WAITLISTED", priceCzk: 1800 }],
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
            terms: [{ name: "2. týden", termNumber: 2, status: "CONFIRMED", priceCzk: 4900 }],
          }),
        ],
      }),
    )

    const { html } = sent(sendEmail)
    expect(html).toContain("Jana Nováková")
    expect(html).toContain("Petr Novák")
    expect(html).toContain("48000")
    expect(html).toContain("49000")
    // Jana has two confirmed terms: each one is listed with its own symbol (US-137).
    expect(html).toContain("48001")
    expect(html).toContain("48002")
    // Petr has one confirmed term, so only the summary symbol is shown for him.
    expect(html).not.toContain("49002")
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
              { name: "1. týden", termNumber: 1, status: "CONFIRMED", priceCzk: 4500 },
              { name: "2. týden", termNumber: 2, status: "WAITLISTED", priceCzk: 4900 },
            ],
          }),
        ],
      }),
    )

    const { html } = sent(sendEmail)
    expect(html).toMatch(/1\. týden:\s*<strong>potvrzený/)
    expect(html).toMatch(/2\. týden:\s*<strong>jste náhradník/)
    expect(html).toContain("4 500 Kč")
    expect(html).not.toContain("9 400 Kč")
    expect(html).toContain("2900123456/2010")
    expect(html).toContain("Za termín, kde jste náhradník, zatím neplaťte")
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
    expect(html).toContain("Žádný termín zatím není potvrzený")
  })

  it("shows payment details only for the application that has a confirmed term", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendSubmissionConfirmation(
      confirmation({
        applications: [application(), waitlisted({ number: 50, accessToken: "t50" })],
      }),
    )

    const { html } = sent(sendEmail)
    expect(html).toContain("48000")
    expect(html).not.toContain("50000")
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
    organizationName: "Alpine Collective",
    bankAccount: "2900123456/2010",
    kind: "CONFIRMED",
    termName: "12.–18. 7. 2027",
    gender: "MALE",
    application: application({
      number: 49,
      firstName: "Petr",
      lastName: "Novák",
      accessToken: "token-49",
      terms: [{ name: "12.–18. 7. 2027", termNumber: 1, status: "CONFIRMED", priceCzk: 4900 }],
    }),
    isAmountChanged: false,
    ...overrides,
  })

  // EMAILY.md row → what the applicant reads, the Czech sentences of the Figma frames. Where a
  // frame declines the name ("účast Adama Dvořáka") the name stands in brackets in its place.
  const T = "12.–18. 7. 2027"
  const sentences = {
    MALE: {
      CONFIRMED: `Organizátor potvrdil účast (Petr Novák) v termínu ${T}.`,
      WAITLISTED: `Petr Novák je v termínu ${T} zařazený mezi náhradníky. Zatím nic neplaťte.`,
      REJECTED: `Organizátor zamítl účast (Petr Novák) v termínu ${T}. Stav přihlášky v tomto termínu je Zrušená.`,
      CONFIRMED_FROM_WAITLIST: `Petr Novák už není náhradník. Jeho účast v termínu ${T} byla potvrzená.`,
      NO_BED_FREED: `Do začátku termínu ${T} se pro (Petr Novák) neuvolnilo lůžko. Přihláška v tomto termínu je proto zrušená.`,
      CANCELLED: `Petr Novák je odhlášený z termínu ${T}. Ostatní termíny přihlášky zůstávají beze změny.`,
      CANCELLED_BY_ORGANIZER: `Organizátor zrušil přihlášku (Petr Novák), který byl náhradníkem v termínu ${T}.`,
      WAITLISTED_AFTER_CONFIRMED: `Organizátor odvolal potvrzení účasti (Petr Novák) v termínu ${T} a zařadil ho mezi náhradníky. Nejde o čekání na první vyhodnocení.`,
    },
    FEMALE: {
      CONFIRMED: `Organizátor potvrdil účast (Petr Novák) v termínu ${T}.`,
      WAITLISTED: `Petr Novák je v termínu ${T} zařazená mezi náhradníky. Zatím nic neplaťte.`,
      REJECTED: `Organizátor zamítl účast (Petr Novák) v termínu ${T}. Stav přihlášky v tomto termínu je Zrušená.`,
      CONFIRMED_FROM_WAITLIST: `Petr Novák už není náhradnice. Její účast v termínu ${T} byla potvrzená.`,
      NO_BED_FREED: `Do začátku termínu ${T} se pro (Petr Novák) neuvolnilo lůžko. Přihláška v tomto termínu je proto zrušená.`,
      CANCELLED: `Petr Novák je odhlášená z termínu ${T}. Ostatní termíny přihlášky zůstávají beze změny.`,
      CANCELLED_BY_ORGANIZER: `Organizátor zrušil přihlášku (Petr Novák), která byla náhradnicí v termínu ${T}.`,
      WAITLISTED_AFTER_CONFIRMED: `Organizátor odvolal potvrzení účasti (Petr Novák) v termínu ${T} a zařadil ji mezi náhradníky. Nejde o čekání na první vyhodnocení.`,
    },
  } as const
  const headings = {
    CONFIRMED: "Účast je potvrzená",
    WAITLISTED: "Jste náhradník",
    REJECTED: "Přihláška byla zamítnuta",
    CONFIRMED_FROM_WAITLIST: "Uvolnilo se lůžko. Účast je potvrzená",
    NO_BED_FREED: "Termín začal, lůžko se neuvolnilo",
    CANCELLED: "Odhlášení je potvrzené",
    CANCELLED_BY_ORGANIZER: "Přihláška zrušená organizátorem",
    WAITLISTED_AFTER_CONFIRMED: "Potvrzení bylo odvoláno. Jste náhradník",
  } as const
  const rows = {
    CONFIRMED: "no. 2",
    WAITLISTED: "no. 3",
    REJECTED: "no. 4, 9, 10",
    CONFIRMED_FROM_WAITLIST: "no. 5",
    NO_BED_FREED: "no. 6",
    CANCELLED: "no. 11",
    CANCELLED_BY_ORGANIZER: "no. 14",
    WAITLISTED_AFTER_CONFIRMED: "no. 13",
  } as const
  const cases = (["MALE", "FEMALE"] as const).flatMap((gender) =>
    (Object.keys(headings) as (keyof typeof headings)[]).map(
      (kind) => [rows[kind], kind, gender] as const,
    ),
  )

  it.each(cases)(
    "EMAILY.md %s (%s, %s): Czech heading, sentence, link into the app and organization footer",
    async (_row, kind, gender) => {
      const { mailer, sendEmail } = setup()

      await mailer.sendApplicationChange(change({ kind, gender }))

      const { to, subject, html } = sent(sendEmail)
      expect(to).toBe("petra@example.com")
      expect(subject).toBe("Změna ve vaší přihlášce: Letní kemp 2027")
      expect(html).toContain(headings[kind])
      expect(html).toContain(sentences[gender][kind])
      expect(html).toContain("Letní kemp 2027")
      expect(html).toContain(`href="${FRONTEND}/apply/confirmation/token-49"`)
      expect(html).toContain("Otevřít moje přihlášky")
      expect(html).toContain("Alpine Collective · přes Togenu")
      expect(html).toContain('lang="cs"')
    },
  )

  it("is responsive: 16 px gutters, 24/32 px heading and a 44 px button at 360 px", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendApplicationChange(change())

    const { html } = sent(sendEmail)
    expect(html).toMatch(/@media[^{]*max-width:\s*480px/)
    expect(html).toContain(".tg-card>tbody>tr>td{padding-left:16px !important")
    expect(html).toContain(".tg-body>table>tbody>tr>td{padding:16px !important}")
    expect(html).toContain("max-480px_text-2xl")
    expect(html).toContain("max-480px_py-3")
  })

  it("keeps TERMS_CHANGED for the term-change stories: the old sentence, payment details when the amount changed", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendApplicationChange(
      change({
        isAmountChanged: true,
        kind: "TERMS_CHANGED",
        application: application({ number: 49 }),
      }),
    )

    const { html } = sent(sendEmail)
    expect(html).toContain("Změnily se termíny přihlášky")
    expect(html).toContain("9 400 Kč")
    expect(html).toContain("49000")
    expect(html).toContain("2900123456/2010")
  })

  it("sends the English e-mail of Figma frame 02 EN for a confirmation, with payment details", async () => {
    const { mailer, sendEmail } = setup()

    await mailer.sendApplicationChange(
      change({ locale: "en", isAmountChanged: true, termName: "12–18 Jul 2027" }),
    )

    const { html } = sent(sendEmail)
    expect(html).toContain("Your place is confirmed")
    expect(html).toContain("The organiser has confirmed Petr Novák’s place for 12–18 Jul 2027.")
    expect(html).toContain("Confirmed · payment due")
    expect(html).toContain("Open my applications")
    expect(html).toContain("Alpine Collective · via Togena")
    expect(html).toContain('lang="en"')
  })

  it.each([
    ["CONFIRMED", "Your place is confirmed"],
    ["CONFIRMED_FROM_WAITLIST", "A bed has become free. Your place is confirmed"],
    ["WAITLISTED", "You are a substitute"],
    ["REJECTED", "Your application was rejected"],
    ["CANCELLED", "Your cancellation is confirmed"],
    ["NO_BED_FREED", "The term has started, no bed became free"],
    ["CANCELLED_BY_ORGANIZER", "Application cancelled by the organiser"],
    ["WAITLISTED_AFTER_CONFIRMED", "Your confirmation was withdrawn. You are a substitute"],
  ] as const)("writes %s in English", async (kind, heading) => {
    const { mailer, sendEmail } = setup()

    await mailer.sendApplicationChange(change({ locale: "en", kind }))

    const { subject, html } = sent(sendEmail)
    expect(subject).toBe("Change in your application: Letní kemp 2027")
    expect(html).toContain(heading)
    expect(html).toContain("Open my applications")
    expect(html).not.toContain("Otevřít moje přihlášky")
  })

  describe("payment details", () => {
    it.each(["CONFIRMED", "CONFIRMED_FROM_WAITLIST"] as const)(
      "%s: amount, account and variable symbol (Czech labels)",
      async (kind) => {
        const { mailer, sendEmail } = setup()

        await mailer.sendApplicationChange(change({ kind, isAmountChanged: true }))

        const { html } = sent(sendEmail)
        expect(html).toContain("K úhradě")
        expect(html).toContain("4 900 Kč")
        expect(html).toContain("Bankovní účet")
        expect(html).toContain("2900123456/2010")
        expect(html).toContain("Variabilní symbol")
        expect(html).toContain("49000")
      },
    )

    it("labels them in English like the 02 EN frame", async () => {
      const { mailer, sendEmail } = setup()

      await mailer.sendApplicationChange(change({ locale: "en", isAmountChanged: true }))

      const { html } = sent(sendEmail)
      expect(html).toContain("Amount due")
      expect(html).toContain("Bank account")
      expect(html).toContain("Reference number")
      expect(html).toContain("CZK 4,900")
    })

    it("lists every confirmed term with its own symbol when several are confirmed", async () => {
      const { mailer, sendEmail } = setup()

      await mailer.sendApplicationChange(
        change({ isAmountChanged: true, application: application() }),
      )

      const { html } = sent(sendEmail)
      expect(html).toContain("9 400 Kč")
      expect(html).toContain("48000")
      expect(html).toContain("48001")
      expect(html).toContain("48002")
    })

    it.each([
      "WAITLISTED",
      "REJECTED",
      "CANCELLED",
      "NO_BED_FREED",
      "CANCELLED_BY_ORGANIZER",
    ] as const)("%s: none, even if a term is still marked confirmed", async (kind) => {
      const { mailer, sendEmail } = setup()

      await mailer.sendApplicationChange(change({ kind, isAmountChanged: true }))

      const { html } = sent(sendEmail)
      expect(html).not.toContain("Variabilní symbol")
      expect(html).not.toContain("K úhradě")
      expect(html).not.toContain("2900123456/2010")
    })

    it("none in the e-mail of no. 13 either", async () => {
      const { mailer, sendEmail } = setup()

      await mailer.sendApplicationChange(
        change({ kind: "WAITLISTED_AFTER_CONFIRMED", isAmountChanged: true }),
      )

      expect(sent(sendEmail).html).not.toContain("Variabilní symbol")
    })
  })

  describe("the waitlist wording", () => {
    it.each(["cs", "en"] as const)("never mentions a place in the queue (%s)", async (locale) => {
      for (const kind of ["WAITLISTED", "WAITLISTED_AFTER_CONFIRMED"] as const) {
        const { mailer, sendEmail } = setup()

        await mailer.sendApplicationChange(change({ locale, kind }))

        // Only what the applicant reads, not the markup (`border`).
        const text = sent(sendEmail).html.replace(/<[^>]*>/g, " ")
        expect(text).toMatch(/náhradník|substitute/i)
        expect(text).not.toMatch(/pořadí|\bpozic|\d+\.\s*místo|position|\brank|queue|order/i)
        expect(text).not.toMatch(/čeká na (potvrzení|vyhodnocení)|awaiting/i)
      }
    })

    it("says the e-mail of no. 13 is not the first evaluation, unlike no. 3", async () => {
      const withdrawn = setup()
      const first = setup()

      await withdrawn.mailer.sendApplicationChange(change({ kind: "WAITLISTED_AFTER_CONFIRMED" }))
      await first.mailer.sendApplicationChange(change({ kind: "WAITLISTED" }))

      expect(sent(withdrawn.sendEmail).html).toContain("Potvrzení bylo odvoláno")
      expect(sent(first.sendEmail).html).not.toContain("odvoláno")
    })
  })

  it("does not fail the caller when delivery fails", async () => {
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
    const { mailer } = setup({ sendError: new Error("boom") })

    await expect(mailer.sendApplicationChange(change())).resolves.toBeUndefined()
  })
})
