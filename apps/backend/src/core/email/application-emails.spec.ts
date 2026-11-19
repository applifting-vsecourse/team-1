import * as React from "react"
import { prerender } from "react-dom/static"
import ApplicationChange from "./templates/application-change"
import ConfirmationWithdrawn from "./templates/application-change-confirmation-withdrawn"
import ApplicationConfirmation from "./templates/application-confirmation"
import TwoApplicants from "./templates/application-confirmation-two-applicants"
import Waitlisted from "./templates/application-confirmation-waitlisted"
import TermCancelled from "./templates/application-term-cancelled"

// The previews of `pnpm backend email:dev` are the sample data of these
// templates; this keeps every variant renderable. (@react-email/render needs
// --experimental-vm-modules under jest, so the plain React renderer is used.)
const render = async (element: React.ReactElement): Promise<string> => {
  const { prelude } = await prerender(element)
  return (await new Response(prelude).text()).replace(/<!-- -->/g, "")
}

describe("application e-mail previews", () => {
  it("renders one participant, new account (cs)", async () => {
    const html = await render(
      React.createElement(ApplicationConfirmation, ApplicationConfirmation.PreviewProps),
    )

    expect(html).toContain("Přihlášku jsme přijali")
    expect(html).toContain("Přihlásit se do Togeny")
  })

  it.each([
    ["cs", "stav jednotlivého termínu.", "stav jednotlivých termínů."],
    ["en", "the status of the selected term.", "the status of each term."],
  ] as const)(
    "matches the number of terms in a single application (%s)",
    async (locale, singular, plural) => {
      const preview = ApplicationConfirmation.PreviewProps
      const [person] = preview.applications
      const receipt = (count: number): Promise<string> =>
        render(
          React.createElement(ApplicationConfirmation, {
            ...preview,
            locale,
            applications: [{ ...person, terms: person.terms.slice(0, count) }],
          }),
        )
      expect(await receipt(1)).toContain(singular)
      expect(await receipt(2)).toContain(plural)
    },
  )

  it("renders two participants, existing account, mixed statuses (en)", async () => {
    const html = await render(React.createElement(TwoApplicants))

    expect(html).toContain("We have received your applications")
    expect(html).toContain("Jana Nováková")
    expect(html).toContain("Petr Novák")
    expect(html).toContain("Pay for each application separately")
    expect(html).toContain("Sign in to Togena")
  })

  it("renders no confirmed term without payment details", async () => {
    const html = await render(React.createElement(Waitlisted))

    expect(html).toContain("Náhradník")
    expect(html).toContain(
      "Pokud bude účast potvrzena, informujeme vás e-mailem. Zatím nic neplaťte.",
    )
    expect(html).not.toContain("Variabilní symbol")
  })

  it("lists a term without a name by its dates", async () => {
    const html = await render(
      React.createElement(ApplicationConfirmation, {
        ...ApplicationConfirmation.PreviewProps,
        applications: [
          {
            ...ApplicationConfirmation.PreviewProps.applications[0],
            terms: [{ name: "12.–18. 7. 2027", status: "CONFIRMED" }],
          },
        ],
      }),
    )

    expect(html).toContain("12.–18. 7. 2027")
  })

  it("renders the change e-mail with payment details", async () => {
    const html = await render(
      React.createElement(ApplicationChange, ApplicationChange.PreviewProps),
    )

    expect(html).toContain("Účast je potvrzená")
    expect(html).toContain("Variabilní symbol")
  })

  it("renders e-mail no. 13, its own template, without payment details", async () => {
    const html = await render(
      React.createElement(ConfirmationWithdrawn, ConfirmationWithdrawn.PreviewProps),
    )

    expect(html).toContain("Potvrzení účasti bylo odvoláno")
    expect(html).not.toContain("Variabilní symbol")
  })

  it("renders e-mail no. 15, the cancelled term, in both languages", async () => {
    const cs = await render(React.createElement(TermCancelled, TermCancelled.PreviewProps))
    const en = await render(
      React.createElement(TermCancelled, { ...TermCancelled.PreviewProps, locale: "en" }),
    )

    expect(cs).toContain("Termín akce byl zrušen")
    expect(cs).toContain(
      "Případné zaplacené platby za zrušený termín se vrací. Další postup vám sdělí organizace.",
    )
    expect(cs).toContain("Adam Dvořák")
    expect(cs).toContain("Alpine Collective · prostřednictvím Togeny")
    expect(en).toContain("The event term has been cancelled")
    expect(en).toContain("Any payments already made for the cancelled term are to be refunded")
    expect(en).toContain("Alpine Collective · via Togena")
  })
})
