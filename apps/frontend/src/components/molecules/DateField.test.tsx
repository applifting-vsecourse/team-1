import { useState } from "react"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DateField } from "@/components/molecules/DateField"
import { i18n } from "@/i18n"

// Radix's popover and select measure and scroll things jsdom doesn't have.
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

afterEach(async () => {
  await act(() => i18n.changeLanguage("en"))
  vi.useRealTimers()
})

function Harness({
  initial = "",
  min,
  max,
  onValue,
}: {
  initial?: string
  min?: string
  max?: string
  onValue?: (value: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <label htmlFor="d">Date</label>
      <DateField
        id="d"
        value={value}
        min={min}
        max={max}
        onChange={(next) => {
          setValue(next)
          onValue?.(next)
        }}
      />
      <output data-testid="value">{value}</output>
    </>
  )
}

const field = () => screen.getByLabelText("Date")
const value = () => screen.getByTestId("value").textContent

describe("DateField", () => {
  it("is a text field with the English format as placeholder", () => {
    render(<Harness />)
    expect(field()).toHaveAttribute("type", "text")
    expect(field()).toHaveAttribute("placeholder", "DD/MM/YYYY")
  })

  it("turns typed text into a yyyy-MM-dd value", async () => {
    render(<Harness />)
    await userEvent.type(field(), "18/05/2014")
    expect(value()).toBe("2014-05-18")
    expect(field()).toHaveValue("18/05/2014")
  })

  it("passes on text that is not a day, and keeps it in the field", async () => {
    render(<Harness />)
    await userEvent.type(field(), "31/02/2014")
    expect(value()).toBe("31/02/2014")
    expect(field()).toHaveValue("31/02/2014")
  })

  it("empties the value when the text is cleared", async () => {
    render(<Harness initial="2014-05-18" />)
    expect(field()).toHaveValue("18/05/2014")
    await userEvent.clear(field())
    expect(value()).toBe("")
  })

  it("writes the picked day to the field and closes the calendar", async () => {
    render(
      <Harness
        initial="2014-05-18"
        min="2014-05-10"
        max="2014-05-25"
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Choose a date in the calendar" }))
    expect(screen.getByRole("grid")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /, 20 May 2014$/ }))
    expect(value()).toBe("2014-05-20")
    expect(field()).toHaveValue("20/05/2014")
    expect(screen.queryByRole("grid")).not.toBeInTheDocument()
  })

  it("disables days outside min and max", async () => {
    render(
      <Harness
        initial="2014-05-18"
        min="2014-05-10"
        max="2014-05-25"
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Choose a date in the calendar" }))

    expect(screen.getByRole("button", { name: /, 9 May 2014$/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /, 10 May 2014$/ })).toBeEnabled()
    expect(screen.getByRole("button", { name: /, 25 May 2014$/ })).toBeEnabled()
    expect(screen.getByRole("button", { name: /, 26 May 2014$/ })).toBeDisabled()
  })

  it("starts the week on Monday and offers month and year selects", async () => {
    render(<Harness initial="2014-05-18" />)
    await userEvent.click(screen.getByRole("button", { name: "Choose a date in the calendar" }))

    const headers = screen.getAllByRole("columnheader", { hidden: true })
    expect(headers).toHaveLength(7)
    expect(headers[0]).toHaveTextContent(/^Mo/)
    expect(screen.getByRole("combobox", { name: "Month" })).toHaveTextContent("May")
    expect(screen.getByRole("combobox", { name: "Year" })).toHaveTextContent("2014")
  })

  it("shows the Czech format and names, and re-renders the value when the language changes", async () => {
    render(<Harness initial="2014-05-08" />)
    expect(field()).toHaveValue("08/05/2014")

    await act(() => i18n.changeLanguage("cs"))
    expect(field()).toHaveValue("8. 5. 2014")
    expect(field()).toHaveAttribute("placeholder", "D. M. RRRR")
    expect(value()).toBe("2014-05-08")

    await userEvent.click(screen.getByRole("button", { name: "Vybrat datum v kalendáři" }))
    expect(screen.getAllByRole("columnheader", { hidden: true })[0]).toHaveTextContent(/^po/i)
    expect(screen.getByRole("combobox", { name: "Měsíc" })).toHaveTextContent("květen")
  })

  it("reads Czech input with and without spaces and zeros", async () => {
    await act(() => i18n.changeLanguage("cs"))
    render(<Harness />)
    await userEvent.type(field(), "18.5.2014")
    expect(value()).toBe("2014-05-18")
    await userEvent.clear(field())
    await userEvent.type(field(), "18. 05. 2014")
    expect(value()).toBe("2014-05-18")
  })

  it("shows the value again in the field when the form resets it", async () => {
    function Resettable() {
      const [v, setV] = useState("2014-05-18")
      return (
        <>
          <label htmlFor="d">Date</label>
          <DateField
            id="d"
            value={v}
            onChange={setV}
          />
          <button onClick={() => setV("")}>reset</button>
        </>
      )
    }
    render(<Resettable />)
    await userEvent.click(screen.getByRole("button", { name: "reset" }))
    expect(field()).toHaveValue("")
  })
})
