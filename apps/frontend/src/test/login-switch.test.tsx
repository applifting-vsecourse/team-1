import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { routeTree } from "@/routeTree.gen"

vi.mock("@/features/auth/api/authSessionQueryOptions", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  authSessionQueryOptions: () => ({ queryKey: ["session"], queryFn: () => Promise.resolve(null) }),
}))
vi.mock("@/features/auth/components/SignInWithRedirect", () => ({
  SignInWithRedirect: () => <button type="button">Sign in</button>,
}))
vi.mock("@/components/organisms/Header", () => ({ Header: () => <header /> }))

vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
}))

const renderAt = async (path: string) => {
  const queryClient = new QueryClient()
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient },
  })
  await router.load()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe("switching between the two sign-ins", () => {
  it("applicant sign-in: a visible outline action for a new link and a separate link to the organizer", async () => {
    await renderAt("/participant/login")

    const newLink = await screen.findByRole("link", { name: "Get a new link" })
    expect(newLink).toHaveAttribute("href", "/participant/magic-link")
    expect(newLink).toHaveClass("w-full", "border")
    const organizer = screen.getByRole("link", { name: "Organizer sign-in" })
    expect(organizer).toHaveAttribute("href", "/organizer/login")
  })

  it("organizer sign-in: a clear link to the applicant sign-in", async () => {
    await renderAt("/organizer/login")

    const applicant = await screen.findByRole("link", { name: "Sign in as an applicant" })
    expect(applicant).toHaveAttribute("href", "/participant/login")
  })
})
