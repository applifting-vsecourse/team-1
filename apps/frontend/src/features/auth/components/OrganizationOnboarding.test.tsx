import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, expect, it, vi } from "vitest"

import { OrganizationOnboarding } from "@/features/auth/components/OrganizationOnboarding"

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock("@/lib/api-client", () => ({ api: { get } }))
vi.mock("@/features/auth/components/RegistrationLayout", () => ({
  RegistrationLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock("@/components/atoms/Seo", () => ({ Seo: () => null }))

beforeEach(() => get.mockReset())

it("retries membership loading without fetching a profile before the organization exists", async () => {
  get
    .mockReturnValueOnce({ json: () => Promise.reject(new Error("offline")) })
    .mockReturnValue({ json: () => Promise.resolve({ organizations: [] }) })

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <OrganizationOnboarding />
    </QueryClientProvider>,
  )

  await screen.findByRole("button", { name: "Try again" })
  await userEvent.click(screen.getByRole("button", { name: "Try again" }))
  await screen.findByRole("heading", { name: "Create an organization" })

  await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
  expect(get).toHaveBeenNthCalledWith(1, "me")
  expect(get).toHaveBeenNthCalledWith(2, "me")
})
