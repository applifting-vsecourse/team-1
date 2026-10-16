// Example component test — the pattern to copy for your own components.
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ErrorState } from "@/components/molecules/ErrorState"

describe("ErrorState", () => {
  it("shows the title and the error message", () => {
    render(
      <ErrorState
        title="Přihlášky se nepodařilo načíst"
        error={new Error("Server neodpovídá")}
      />,
    )

    expect(screen.getByText("Přihlášky se nepodařilo načíst")).toBeInTheDocument()
    expect(screen.getByText("Server neodpovídá")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("offers a working retry", async () => {
    const onRetry = vi.fn()
    render(
      <ErrorState
        title="Přihlášky se nepodařilo načíst"
        error={new Error("Server neodpovídá")}
        onRetry={onRetry}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
