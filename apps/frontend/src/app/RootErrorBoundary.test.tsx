import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import "@/i18n"

import { installGlobalErrorHandlers } from "@/app/globalErrorHandlers"
import { RootErrorBoundary } from "@/app/RootErrorBoundary"

function Broken(): never {
  throw new Error("provider exploded")
}

describe("RootErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks())

  it("shows the error page, outside any router, when the app crashes", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    render(
      <RootErrorBoundary>
        <Broken />
      </RootErrorBoundary>,
    )

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument()
    expect(screen.queryByText(/provider exploded/)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /togena/ })).toHaveAttribute("href", "/")
    expect(consoleError).toHaveBeenCalled()
  })

  it("renders its children when nothing fails", () => {
    render(
      <RootErrorBoundary>
        <p>All fine</p>
      </RootErrorBoundary>,
    )
    expect(screen.getByText("All fine")).toBeInTheDocument()
  })
})

describe("installGlobalErrorHandlers", () => {
  it("logs uncaught errors and unhandled rejections", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const uninstall = installGlobalErrorHandlers(window)
    const boom = new Error("boom")

    window.dispatchEvent(new ErrorEvent("error", { error: boom }))
    const rejection = new Event("unhandledrejection") as Event & { reason: unknown }
    rejection.reason = "nope"
    window.dispatchEvent(rejection)
    uninstall()

    expect(consoleError).toHaveBeenCalledWith(boom)
    expect(consoleError).toHaveBeenCalledWith("nope")
    consoleError.mockRestore()
  })
})
