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
  it("applicant sign-in: one card that leads to the organizer sign-in in its footer", async () => {
    await renderAt("/participant/login")

    expect(
      await screen.findByRole("heading", { level: 1, name: "Applicant sign-in" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Are you an organizer\?/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Sign in as an organizer" })).toHaveAttribute(
      "href",
      "/organizer/login",
    )
  })

  it("organizer sign-in: links to registration and to the applicant sign-in", async () => {
    await renderAt("/organizer/login")

    expect(
      await screen.findByRole("heading", { level: 1, name: "Organizer sign-in" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/organizer/register",
    )
    expect(screen.getByRole("link", { name: "Sign in as an applicant" })).toHaveAttribute(
      "href",
      "/participant/login",
    )
  })
})
