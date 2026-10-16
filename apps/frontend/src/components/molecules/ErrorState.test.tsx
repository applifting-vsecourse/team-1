// Example component test — the pattern to copy for your own components.
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ErrorState } from "@/components/molecules/ErrorState"

describe("ErrorState", () => {
  it("shows the title and the error message", () => {
    render(
      <ErrorState
        title="Couldn't load applications"
        error={new Error("Server unreachable")}
      />,
    )

    expect(screen.getByText("Couldn't load applications")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("offers a working retry", async () => {
    const onRetry = vi.fn()
    render(
      <ErrorState
        title="Couldn't load applications"
        error={new Error("Server unreachable")}
        onRetry={onRetry}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
