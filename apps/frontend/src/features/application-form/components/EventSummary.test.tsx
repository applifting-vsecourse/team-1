import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { PublicEvent } from "@/features/application-form/api/publicEvent"
import { EventSummary } from "@/features/application-form/components/EventSummary"

const event: PublicEvent = {
  name: "Summer camp 2027",
  description: "Not shown — the design has no place for it",
  location: "Lipno",
  terms: [
    { id: "t1", name: "Week 1", startsOn: "2027-07-12", endsOn: "2027-07-18", priceCzk: 6900 },
    { id: "t2", name: "Week 2", startsOn: "2027-08-02", endsOn: "2027-08-08", priceCzk: 7400 },
  ],
}

describe("EventSummary", () => {
  it("shows the event, where and when, and every term with its dates and price", () => {
    render(<EventSummary event={event} />)

    expect(screen.getByRole("heading", { name: "Summer camp 2027" })).toBeInTheDocument()
    expect(screen.getByText("Lipno · July–August 2027")).toBeInTheDocument()
    expect(screen.getByText("12–18 Jul 2027").closest("li")).toHaveTextContent(
      "12–18 Jul 2027 · CZK 6,900",
    )
    expect(screen.getByText("2–8 Aug 2027").closest("li")).toHaveTextContent(
      "2–8 Aug 2027 · CZK 7,400",
    )
  })
})
