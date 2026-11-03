import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { OrganizationContact as OrganizationContactData } from "@/features/participant/api/applications"
import { OrganizationContact } from "@/features/participant/components/OrganizationContact"

const contact = (overrides: Partial<OrganizationContactData> = {}): OrganizationContactData => ({
  name: "Alpine Collective",
  email: "info@alpine.example",
  phone: "+420 777 000 003",
  ...overrides,
})

describe("OrganizationContact", () => {
  it("links the e-mail to the mail client and the phone to a dial link without spaces", () => {
    render(<OrganizationContact contact={contact()} />)

    expect(screen.getByRole("heading", { name: "Organization contact" })).toBeInTheDocument()
    expect(screen.getByText("Alpine Collective")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "info@alpine.example" })).toHaveAttribute(
      "href",
      "mailto:info@alpine.example",
    )
    const phone = screen.getByRole("link", { name: "+420 777 000 003" })
    expect(phone).toHaveAttribute("href", "tel:+420777000003")
    // Shown as the organizer typed it.
    expect(phone).toHaveTextContent("+420 777 000 003")
  })

  it("leaves out the phone when there is only an e-mail", () => {
    render(<OrganizationContact contact={contact({ phone: null })} />)

    expect(screen.getByRole("link", { name: "info@alpine.example" })).toBeInTheDocument()
    expect(screen.queryByText("Phone")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /\+420/ })).not.toBeInTheDocument()
  })

  it("leaves out the e-mail when there is only a phone", () => {
    render(<OrganizationContact contact={contact({ email: null })} />)

    expect(screen.getByRole("link", { name: "+420 777 000 003" })).toBeInTheDocument()
    expect(screen.queryByText("E-mail")).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /alpine/ })).not.toBeInTheDocument()
  })

  it("shows just the organization name without any contact", () => {
    render(<OrganizationContact contact={contact({ email: null, phone: null })} />)

    expect(screen.getByText("Alpine Collective")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.queryByText("E-mail")).not.toBeInTheDocument()
    expect(screen.queryByText("Phone")).not.toBeInTheDocument()
  })

  it("stacks the lines in one column below the md breakpoint (360 px)", () => {
    render(<OrganizationContact contact={contact()} />)

    const row = screen.getByText("Alpine Collective").parentElement!
    // flex-col applies until `md:flex-row` takes over at 768 px, so a 360 px phone gets one column.
    expect(row).toHaveClass("flex-col", "md:flex-row")
  })
})
