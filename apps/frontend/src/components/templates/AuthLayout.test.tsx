import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { EmbeddedPageContext } from "@/components/atoms/EmbeddedPage"
import { AuthLayout } from "@/components/templates/AuthLayout"

vi.mock("@/components/organisms/Header", () => ({ Header: () => <header>Public header</header> }))

describe("AuthLayout", () => {
  it("renders the public header and main on its own", () => {
    render(
      <AuthLayout
        title="Title"
        description="Description"
      >
        <p>Body</p>
      </AuthLayout>,
    )

    expect(screen.getByText("Public header")).toBeInTheDocument()
    expect(screen.getByRole("main")).toBeInTheDocument()
  })

  it("renders only the content inside an area layout", () => {
    render(
      <EmbeddedPageContext.Provider value>
        <AuthLayout
          title="Title"
          description="Description"
        >
          <p>Body</p>
        </AuthLayout>
      </EmbeddedPageContext.Provider>,
    )

    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument()
    expect(screen.queryByText("Public header")).not.toBeInTheDocument()
    expect(screen.queryByRole("main")).not.toBeInTheDocument()
  })
})
