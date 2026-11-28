import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Pagination } from "@/components/molecules/Pagination"

const renderPagination = (page: number, onPageChange = vi.fn()) =>
  render(
    <Pagination
      page={page}
      pageCount={10}
      pageSize={20}
      total={196}
      onPageChange={onPageChange}
    />,
  )

describe("Pagination", () => {
  it("renders nothing when everything fits on one page", () => {
    const { container } = render(
      <Pagination
        page={0}
        pageCount={1}
        pageSize={20}
        total={3}
        onPageChange={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the range, marks the current page and disables the arrow at the edge", () => {
    renderPagination(0)

    expect(screen.getByText("1–20 / 196")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled()
  })

  it("shows at most five page numbers around the current page", () => {
    renderPagination(6)

    const numbers = screen.getAllByRole("button", { name: /^Page / }).map((b) => b.textContent)
    expect(numbers).toEqual(["5", "6", "7", "8", "9"])
  })

  it("moves by the arrows and the numbers", async () => {
    const onPageChange = vi.fn()
    renderPagination(9, onPageChange)

    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }))
    await userEvent.click(screen.getByRole("button", { name: "Page 6" }))
    expect(onPageChange.mock.calls).toEqual([[8], [5]])
  })
})
