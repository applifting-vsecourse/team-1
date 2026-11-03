import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { ChangeEmailSection } from "@/features/auth/components/ChangeEmailSection"

const { requestEmailChange } = vi.hoisted(() => ({ requestEmailChange: vi.fn() }))

vi.mock("@/features/auth/api/emailChange", () => ({ requestEmailChange }))
// The API client reads the `code` that its error hook put on an HTTP error.
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiErrorCode: (error: unknown) => (error as { code?: string }).code,
}))
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))

const user: SessionUser = {
  id: "u1",
  email: "eva.mala@example.cz",
  name: "Eva Malá",
  accountType: "PARTICIPANT",
  mustSetPassword: false,
  locale: "en",
}

const renderSection = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <ChangeEmailSection user={user} />
      </div>
    </QueryClientProvider>,
  )

const send = async (address: string) => {
  await userEvent.click(screen.getByRole("button", { name: "Change e-mail" }))
  await userEvent.type(screen.getByLabelText("New e-mail *"), address)
  await userEvent.click(screen.getByRole("button", { name: "Send verification link" }))
}

describe("ChangeEmailSection", () => {
  beforeEach(async () => {
    requestEmailChange.mockReset()
    await i18n.changeLanguage("en")
  })

  it("starts closed: the current e-mail, the note under the cards and a button, no field", () => {
    renderSection()

    expect(screen.getByRole("heading", { name: "Sign-in e-mail" })).toBeInTheDocument()
    expect(screen.getByText("eva.mala@example.cz")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Change e-mail" })).toBeInTheDocument()
    expect(screen.queryByLabelText("New e-mail *")).not.toBeInTheDocument()
    // The remark that applications stay on the account appears once, under the cards.
    expect(
      screen.getAllByText(/contact (address|e-mail) in applications already sent/),
    ).toHaveLength(1)
  })

  it("opens the form with the field and what the change does", async () => {
    renderSection()

    await userEvent.click(screen.getByRole("button", { name: "Change e-mail" }))

    expect(screen.getByLabelText("New e-mail *")).toHaveValue("")
    expect(
      screen.getByText(
        "The change takes effect only after you confirm the link sent to the new address.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send verification link" })).toBeInTheDocument()
  })

  it("refuses an address that is not an e-mail and sends nothing", async () => {
    renderSection()

    await send("eva.nova@")

    expect(await screen.findByText("Enter a valid e-mail address.")).toBeInTheDocument()
    expect(requestEmailChange).not.toHaveBeenCalled()
  })

  it("sends the new address and then waits for the link: old e-mail stays, the change is shown", async () => {
    requestEmailChange.mockResolvedValue(undefined)
    renderSection()

    await send("eva.nova@example.cz")

    expect(requestEmailChange).toHaveBeenCalledWith("eva.nova@example.cz")
    expect(await screen.findByText("Confirm the new address.")).toBeInTheDocument()
    expect(
      screen.getByText(
        "We sent a verification link to eva.nova@example.cz. Until you confirm, your original e-mail stays in use.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("Original e-mail").nextSibling).toHaveTextContent("eva.mala@example.cz")
    expect(screen.getByText("New e-mail").nextSibling).toHaveTextContent("eva.nova@example.cz")
    expect(screen.queryByLabelText("New e-mail *")).not.toBeInTheDocument()
  })

  it("goes back to the closed card from the waiting state", async () => {
    requestEmailChange.mockResolvedValue(undefined)
    renderSection()
    await send("eva.nova@example.cz")

    await userEvent.click(await screen.findByRole("button", { name: "Enter a different address" }))

    expect(screen.getByRole("button", { name: "Change e-mail" })).toBeInTheDocument()
  })

  it("says the address is taken when the server refuses it for belonging to an account", async () => {
    requestEmailChange.mockRejectedValue(Object.assign(new Error("x"), { code: "EMAIL_TAKEN" }))
    renderSection()

    await send("taken@example.cz")

    expect(await screen.findByText("This e-mail is already taken.")).toBeInTheDocument()
    expect(screen.queryByText("Confirm the new address.")).not.toBeInTheDocument()
  })

  it("shows the generic error when sending fails for another reason", async () => {
    requestEmailChange.mockRejectedValue(new Error("down"))
    renderSection()

    await send("eva.nova@example.cz")

    expect(await screen.findByRole("alert")).toHaveTextContent(i18n.t("errors:UNKNOWN"))
    expect(screen.getByLabelText("New e-mail *")).toHaveValue("eva.nova@example.cz")
  })

  it("says the e-mail could not be sent when delivery fails", async () => {
    requestEmailChange.mockRejectedValue(
      Object.assign(new Error("x"), { code: "EMAIL_DELIVERY_FAILED" }),
    )
    renderSection()

    await send("eva.nova@example.cz")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The verification e-mail could not be sent",
    )
  })

  it("closes the form with Cancel and starts empty the next time", async () => {
    renderSection()
    await userEvent.click(screen.getByRole("button", { name: "Change e-mail" }))
    await userEvent.type(screen.getByLabelText("New e-mail *"), "eva.nova@example.cz")

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByLabelText("New e-mail *")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Change e-mail" }))
    expect(screen.getByLabelText("New e-mail *")).toHaveValue("")
  })

  it("is written in Czech with the texts of the design", async () => {
    await i18n.changeLanguage("cs")
    renderSection()

    expect(screen.getByRole("heading", { name: "Přihlašovací e-mail" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Změnit e-mail" }))
    expect(screen.getByLabelText("Nový e-mail *")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Odeslat ověřovací odkaz" })).toBeInTheDocument()
    expect(screen.getByText("Tvoje přihlášky zůstávají v účtu")).toBeInTheDocument()
  })
})
