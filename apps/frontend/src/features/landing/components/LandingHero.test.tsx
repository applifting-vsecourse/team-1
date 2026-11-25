import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { LandingHero } from "@/features/landing/components/LandingHero"

function renderHero() {
  const router = createRouter({
    routeTree: createRootRoute({ component: LandingHero }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(<RouterProvider router={router} />)
}

const illustration = async () =>
  (await screen.findByRole("heading", { level: 1 })).closest("section")?.querySelector(".sticker")
    ?.parentElement

afterEach(() => cleanup())

// Vitest gives each test file fresh modules, so the first render here is the first visit.
describe("LandingHero", () => {
  it("assembles the camp (M31) and sticks the sticker (M32) on the first visit only", async () => {
    renderHero()
    const firstVisit = await illustration()
    expect(firstVisit).toHaveClass("brand-assemble")
    expect(firstVisit).toHaveAttribute("aria-hidden", "true")
    expect(firstVisit?.querySelector(".sticker")).toHaveAttribute("data-animated", "true")
    cleanup()

    renderHero()
    const comeBack = await illustration()
    expect(comeBack).not.toHaveClass("brand-assemble")
    expect(comeBack?.querySelector(".sticker")).not.toHaveAttribute("data-animated")
  })

  it("shows the sample term of the illustration in the visitor's date format", async () => {
    renderHero()
    expect(await screen.findByText("12–18 Jul 2027")).toBeInTheDocument()
  })
})
