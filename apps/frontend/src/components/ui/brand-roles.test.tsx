import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NotificationBell } from "@/components/molecules/NotificationBell"
import { ViewToggleGroup, ViewToggleGroupItem } from "@/components/molecules/ViewToggleGroup"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// System B (DESIGN.md, Colour): solid orange with ink content marks „you are here / this is yours“.
describe("orange roles in the kit", () => {
  it("fills the selected pill tab orange with ink text and the ink edge; line tabs stay ink", () => {
    render(
      <>
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs defaultValue="a">
          <TabsList variant="line">
            <TabsTrigger value="a">Line</TabsTrigger>
          </TabsList>
        </Tabs>
      </>,
    )

    const selected = screen.getByRole("tab", { name: "Upcoming" })
    expect(selected).toHaveAttribute("data-state", "active")
    expect(selected).toHaveClass(
      "group-data-[variant=default]/tabs-list:data-[state=active]:bg-brand-warm",
      "group-data-[variant=default]/tabs-list:data-[state=active]:text-brand-warm-foreground",
      "group-data-[variant=default]/tabs-list:data-[state=active]:border-border-strong",
    )
    expect(screen.getByRole("tab", { name: "Line" })).toHaveClass("after:bg-foreground")
  })

  it("fills the chosen view of a view toggle orange with ink text and the ink edge", () => {
    render(
      <ViewToggleGroup
        value="list"
        aria-label="View"
      >
        <ViewToggleGroupItem value="list">List</ViewToggleGroupItem>
        <ViewToggleGroupItem value="grid">Grid</ViewToggleGroupItem>
      </ViewToggleGroup>,
    )

    const chosen = screen.getByRole("radio", { name: "List" })
    expect(chosen).toHaveAttribute("data-state", "on")
    expect(chosen).toHaveClass(
      "data-[state=on]:bg-brand-warm",
      "data-[state=on]:text-brand-warm-foreground",
      "data-[state=on]:border-border-strong",
    )
  })

  it("puts the avatar initials in ink Medium 14 / 20 on orange, without an edge", () => {
    render(
      <Avatar>
        <AvatarFallback>EM</AvatarFallback>
      </Avatar>,
    )

    const initials = screen.getByText("EM")
    expect(initials).toHaveClass(
      "bg-brand-warm",
      "text-brand-warm-foreground",
      "text-sm",
      "font-medium",
    )
    expect(initials.className).not.toMatch(/border/)
  })

  it("shows the unread count in ink on orange", () => {
    render(<NotificationBell unreadCount={3} />)

    const count = screen.getByText("3")
    expect(count).toHaveClass("bg-brand-warm", "text-brand-warm-foreground")
    expect(count.className).not.toMatch(/bg-primary/)
  })
})
