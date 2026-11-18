import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TermProgram } from "@/features/program/api/program"
import { CopyProgramDialog } from "@/features/program/components/CopyProgramDialog"

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)
Element.prototype.hasPointerCapture = () => false
Element.prototype.scrollIntoView = vi.fn()

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock("@/lib/api-client", () => ({ api: { post }, apiErrorCode: () => undefined }))

const block = (id: string, date: string, name: string, startTime = "10:00", endTime = "11:00") => ({
  id,
  date,
  startTime,
  endTime,
  name,
  place: "Louka",
  description: "Popis",
})
const target = (blocks: TermProgram["blocks"]): TermProgram => ({
  termId: "t1",
  termName: "Cíl",
  startsOn: "2027-07-12",
  endsOn: "2027-07-13",
  blocks,
})
const source: TermProgram = {
  termId: "t2",
  termName: "Zdroj",
  startsOn: "2027-07-19",
  endsOn: "2027-07-21",
  blocks: [block("a", "2027-07-19", "Orientační běh"), block("b", "2027-07-21", "Večerka")],
}

function open(targetTerm: TermProgram, sources: TermProgram[] = [source]) {
  const onCopied = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CopyProgramDialog
        eventId="e1"
        target={targetTerm}
        sourceTerms={sources}
        onClose={onClose}
        onCopied={onCopied}
      />
    </QueryClientProvider>,
  )
  return { onCopied, onClose }
}

async function pickSource() {
  await userEvent.click(screen.getByRole("combobox", { name: "Source term" }))
  await userEvent.click(await screen.findByRole("option", { name: /Zdroj/ }))
}

beforeEach(() => {
  post.mockReset()
  post.mockReturnValue({
    json: () => Promise.resolve({ copied: 1, skipped: 1, overlaps: [] }),
  })
})

describe("CopyProgramDialog", () => {
  it("previews the copy, counts the skipped blocks and sends it", async () => {
    const { onCopied, onClose } = open(target([]))
    expect(screen.getByRole("button", { name: /^Copy/ })).toBeDisabled()
    await pickSource()
    expect(screen.getByText("1 block will be copied")).toBeInTheDocument()
    expect(screen.getByText("1 block will be skipped")).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Copy 1 block" }))
    expect(post).toHaveBeenCalledWith("organizer/events/e1/program/terms/t1/copy", {
      json: { sourceTermId: "t2", strategy: "ADD" },
    })
    await vi.waitFor(() => {
      expect(onCopied).toHaveBeenCalledWith({ copied: 1, skipped: 1, overlaps: [] }, "ADD")
    })
    expect(onClose).toHaveBeenCalled()
  })

  it("offers add or replace when the target has a program and warns about an overlap", async () => {
    open(target([block("x", "2027-07-12", "Hry", "10:30", "12:00")]))
    await pickSource()
    expect(screen.getByRole("radio", { name: "Add to the existing blocks" })).toBeChecked()
    expect(screen.getByText("1 time overlap")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("radio", { name: "Replace the existing program" }))
    expect(screen.queryByText("1 time overlap")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Replace the program" }))
    expect(post).toHaveBeenCalledWith("organizer/events/e1/program/terms/t1/copy", {
      json: { sourceTermId: "t2", strategy: "REPLACE" },
    })
  })

  it("says there is no suitable source when no other term has a program", () => {
    open(target([]), [{ ...source, blocks: [] }])
    expect(screen.getByText("No suitable source term")).toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
  })
})
