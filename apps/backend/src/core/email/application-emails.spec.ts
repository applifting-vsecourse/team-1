import * as React from "react"
import { prerender } from "react-dom/static"
import ApplicationChange from "./templates/application-change"
import ApplicationConfirmation from "./templates/application-confirmation"
import TwoApplicants from "./templates/application-confirmation-two-applicants"
import Waitlisted from "./templates/application-confirmation-waitlisted"

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

    expect(html).toContain("Přihláška přijata")
    expect(html).toContain("Otevřít moje přihlášky")
  })

  it("renders two participants, existing account, mixed statuses (en)", async () => {
    const html = await render(React.createElement(TwoApplicants))

    expect(html).toContain("Application received")
    expect(html).toContain("Jana Nováková")
    expect(html).toContain("Petr Novák")
    expect(html).toContain("please pay each one separately")
    expect(html).toContain(">Sign in<")
  })

  it("renders no confirmed term without payment details", async () => {
    const html = await render(React.createElement(Waitlisted))

    expect(html).toContain("jste náhradník")
    expect(html).toContain("Žádný termín zatím není potvrzený")
    expect(html).not.toContain("Variabilní symbol")
  })

  it("renders the change e-mail with payment details", async () => {
    const html = await render(
      React.createElement(ApplicationChange, ApplicationChange.PreviewProps),
    )

    expect(html).toContain("Změna přihlášky")
    expect(html).toContain("Variabilní symbol")
  })
})
