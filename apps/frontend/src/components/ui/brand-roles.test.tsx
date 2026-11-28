import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NotificationBell } from "@/components/molecules/NotificationBell"
import { ViewToggleGroup, ViewToggleGroupItem } from "@/components/molecules/ViewToggleGroup"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// System B (DESIGN.md, Colour): solid orange with ink content marks „you are here / this is yours“.
describe("orange roles in the kit", () => {
  it("marks the selected pill tab with the nav A marker, not an orange fill; line tabs stay ink", () => {
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
    expect(selected).toHaveAttribute("aria-selected", "true")
    expect(selected).toHaveAttribute("data-state", "active")
    expect(selected).toHaveClass(
      "group-data-[variant=default]/tabs-list:data-[state=active]:bg-nav-active",
      "group-data-[variant=default]/tabs-list:data-[state=active]:font-semibold",
      "group-data-[variant=default]/tabs-list:data-[state=active]:after:bg-nav-indicator",
      "group-data-[variant=default]/tabs-list:data-[state=active]:after:w-5",
    )
    expect(selected.className).not.toMatch(/brand-warm|border-strong/)
    expect(screen.getByRole("tab", { name: "Line" })).toHaveClass("after:bg-foreground")
  })

  it("marks the chosen view of a view toggle with the nav A marker", () => {
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
    expect(chosen).toHaveAttribute("aria-checked", "true")
    expect(chosen).toHaveAttribute("data-state", "on")
    expect(chosen).toHaveClass(
      "data-[state=on]:bg-nav-active",
      "data-[state=on]:font-semibold",
      "data-[state=on]:text-foreground",
      "data-[state=on]:after:bg-nav-indicator",
      "data-[state=on]:after:w-5",
      "data-[state=on]:after:h-0.75",
      "px-4",
      "py-3",
    )
    expect(chosen.className).not.toMatch(/brand-warm|border-strong/)
    // The bold ghost label reserves the width of the selected state.
    expect(screen.getByText("List")).toHaveAttribute("data-label", "List")
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
