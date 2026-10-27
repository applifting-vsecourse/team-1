import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import "@/i18n"

import { ErrorPage } from "@/components/pages/ErrorPage"

describe("ErrorPage", () => {
  afterEach(() => vi.restoreAllMocks())

  it("explains the problem without the technical message and logs it", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const error = new Error("ECONNREFUSED 10.0.0.1:5432")
    render(<ErrorPage error={error} />)

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument()
    expect(screen.getByText("The page couldn't be displayed.")).toBeInTheDocument()
    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith(error)
  })

  it("offers a reload and a link to the home page, without a router", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    render(<ErrorPage error={new Error("boom")} />)

    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to home page" })).toHaveAttribute("href", "/")
  })
})
