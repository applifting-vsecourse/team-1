import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import "@/i18n"

import { EmbeddedPageContext } from "@/components/atoms/EmbeddedPage"
import { ErrorPage } from "@/components/pages/ErrorPage"

// Rendered embedded (no public header), as in the root fallback and below the area layouts: no router needed.
const renderPage = (error: Error) =>
  render(
    <EmbeddedPageContext.Provider value>
      <ErrorPage error={error} />
    </EmbeddedPageContext.Provider>,
  )

describe("ErrorPage", () => {
  afterEach(() => vi.restoreAllMocks())

  it("says something went wrong without the technical message, and logs it", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const error = new Error("ECONNREFUSED 10.0.0.1:5432")
    renderPage(error)

    expect(
      screen.getByRole("heading", { level: 1, name: "Something went wrong" }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith(error)
  })

  it("offers the one action, a reload, without a router", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    renderPage(new Error("boom"))

    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
