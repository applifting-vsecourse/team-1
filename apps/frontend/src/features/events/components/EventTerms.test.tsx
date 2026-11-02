import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

import { EventTerms } from "@/features/events/components/EventTerms"

const event = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Kemp Lipno",
  name: "Letní kemp Lipno 2027",
  description: null,
  location: null,
  contactEmail: null,
  contactPhone: null,
  publishedInCatalog: false,
  photoFileName: null,
  publicToken: "tok",
  createdAt: "2027-01-01T10:00:00.000Z",
  termCount: 2,
  startsOn: "2027-07-12",
  endsOn: "2027-08-08",
  applicationsOpen: true,
  evaluationMode: "AUTOMATIC",
  evaluationModeLocked: true,
  missing: [],
  terms: [],
}
const term = (overrides: object) => ({
  id: "t1",
  eventId: "e1",
  name: "Letní turnus 1",
  startsOn: "2027-07-12",
  endsOn: "2027-07-18",
  priceCzk: 6900,
  roomMode: "GENDERED",
  roomCount: 2,
  capacity: 60,
  confirmedCount: 0,
  waitlistedCount: 0,
  cancelledAt: null,
  cancelReason: null,
  ...overrides,
})
const terms = [
  term({}),
  term({
    id: "t2",
    name: "Srpnový turnus",
    startsOn: "2027-08-02",
    endsOn: "2027-08-08",
    confirmedCount: 18,
    waitlistedCount: 1,
  }),
  term({ id: "t3", name: "Zrušený", cancelledAt: "2027-02-01T10:00:00.000Z", cancelReason: "x" }),
]

const sentBodies: unknown[] = []

function renderTerms(list: unknown[] = terms, created: unknown = terms[0]) {
  sentBodies.length = 0
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const request = input as Request
    if (request.method === "POST") sentBodies.push(await request.clone().json())
    const isTerms = request.url.endsWith("/terms")
    const body = request.method === "POST" ? created : isTerms ? list : event
    return Promise.resolve(
      new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }),
    )
  })
  const root = createRootRoute()
  const page = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <EventTerms eventId="e1" />,
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return fetchMock
}

const posts = (fetchMock: ReturnType<typeof renderTerms>) =>
  fetchMock.mock.calls.filter(([request]) => (request as Request).method === "POST")

afterEach(() => vi.restoreAllMocks())

describe("EventTerms", () => {
  it("lists active terms with period, price and occupancy, and the cancelled ones apart", async () => {
    renderTerms()

    expect(await screen.findByRole("heading", { name: "Event terms · 2" })).toBeInTheDocument()
    expect(screen.getByText("12–18 Jul 2027")).toBeInTheDocument()
    expect(screen.getByText(/^Letní turnus 1 · /)).toBeInTheDocument()
    expect(screen.getByText("0 / 60 places")).toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "18 / 60 places" })).toBeInTheDocument()
    expect(screen.getByText("Cancelled term")).toBeInTheDocument()
    expect(screen.getByText("Zrušený · 12–18 Jul 2027 · Cancelled")).toBeInTheDocument()
  })

  it("lists a term without a name by its dates only", async () => {
    renderTerms([term({ name: null }), terms[1]])

    expect(await screen.findByText("12–18 Jul 2027")).toBeInTheDocument()
    const row = screen.getByText("12–18 Jul 2027").closest("li") as HTMLElement
    expect(within(row).getByText("CZK 6,900")).toBeInTheDocument()
    expect(within(row).queryByText(/null| · /)).not.toBeInTheDocument()
    expect(
      within(row).getByRole("button", { name: "Actions for 12–18 Jul 2027" }),
    ).toBeInTheDocument()
  })

  it("adds a term without a name and confirms it by its dates", async () => {
    const success = vi.spyOn(notify, "success")
    renderTerms(terms, term({ id: "t9", name: null }))
    await userEvent.click(await screen.findByRole("button", { name: "Add term" }))
    const dialog = await screen.findByRole("dialog")

    await userEvent.type(within(dialog).getByLabelText("Start date *"), "12/07/2027")
    await userEvent.type(within(dialog).getByLabelText("End date *"), "18/07/2027")
    await userEvent.type(within(dialog).getByLabelText("Term price (CZK) *"), "6900")
    await userEvent.click(within(dialog).getByRole("button", { name: "Add term" }))

    await waitFor(() => expect(success).toHaveBeenCalledWith("The term 12–18 Jul 2027 was added."))
    expect(sentBodies[0]).toEqual({
      name: "",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      priceCzk: 6900,
    })
  })

  it("has the optional name first, then the dates and the price", async () => {
    window.innerWidth = 360
    renderTerms()
    await userEvent.click(await screen.findByRole("button", { name: "Add term" }))
    const dialog = await screen.findByRole("dialog")

    const dates = within(dialog).getByLabelText("Start date *")
    const name = within(dialog).getByLabelText("Term name (optional)")
    const price = within(dialog).getByLabelText("Term price (CZK) *")
    expect(name).toHaveAttribute("placeholder", "e.g. 1st turn, class 5, ages 8–10")
    expect(name).not.toBeRequired()
    expect(name.compareDocumentPosition(dates) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(dates.compareDocumentPosition(price) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("shows a cancelled term without a name by its dates", async () => {
    renderTerms([
      terms[0],
      term({ id: "t3", name: null, cancelledAt: "2027-02-01T10:00:00.000Z", cancelReason: "x" }),
    ])

    expect(await screen.findByText("12–18 Jul 2027 · Cancelled")).toBeInTheDocument()
  })

  it("shows the error and sends nothing when the end is before the start", async () => {
    const fetchMock = renderTerms()
    await userEvent.click(await screen.findByRole("button", { name: "Add term" }))
    const dialog = await screen.findByRole("dialog")

    await userEvent.type(within(dialog).getByLabelText("Term name (optional)"), "Letní turnus 3")
    await userEvent.type(within(dialog).getByLabelText("Start date *"), "09/08/2027")
    await userEvent.type(within(dialog).getByLabelText("End date *"), "08/08/2027")
    await userEvent.type(within(dialog).getByLabelText("Term price (CZK) *"), "7600")
    await userEvent.click(within(dialog).getByRole("button", { name: "Add term" }))

    expect(await within(dialog).findByText("The end must be after the start.")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("End date *")).toHaveAttribute("aria-invalid", "true")
    expect(posts(fetchMock)).toHaveLength(0)
  })

  it("keeps a date that is not a day in the field, asks for the format and sends nothing", async () => {
    const fetchMock = renderTerms()
    await userEvent.click(await screen.findByRole("button", { name: "Add term" }))
    const dialog = await screen.findByRole("dialog")

    await userEvent.type(within(dialog).getByLabelText("Term name (optional)"), "Letní turnus 3")
    await userEvent.type(within(dialog).getByLabelText("Start date *"), "31/02/2027")
    await userEvent.type(within(dialog).getByLabelText("End date *"), "15/08/2027")
    await userEvent.type(within(dialog).getByLabelText("Term price (CZK) *"), "7600")
    await userEvent.click(within(dialog).getByRole("button", { name: "Add term" }))

    expect(await within(dialog).findByText("Enter the date as DD/MM/YYYY.")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Start date *")).toHaveValue("31/02/2027")
    expect(within(dialog).getByLabelText("Start date *")).toHaveAttribute("aria-invalid", "true")
    expect(posts(fetchMock)).toHaveLength(0)
  })

  it("shows the missing-price error and sends nothing when the price is empty", async () => {
    const fetchMock = renderTerms()
    await userEvent.click(await screen.findByRole("button", { name: "Add term" }))
    const dialog = await screen.findByRole("dialog")

    await userEvent.type(within(dialog).getByLabelText("Term name (optional)"), "Letní turnus 3")
    await userEvent.type(within(dialog).getByLabelText("Start date *"), "09/08/2027")
    await userEvent.type(within(dialog).getByLabelText("End date *"), "15/08/2027")
    await userEvent.click(within(dialog).getByRole("button", { name: "Add term" }))

    expect(
      await within(dialog).findByText("Fill in the price per person in CZK."),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Term price (CZK) *")).toHaveAttribute(
      "aria-invalid",
      "true",
    )
    expect(posts(fetchMock)).toHaveLength(0)
  })

  it("adds a term and confirms it", async () => {
    const success = vi.spyOn(notify, "success")
    const fetchMock = renderTerms()
    await userEvent.click(await screen.findByRole("button", { name: "Add term" }))
    const dialog = await screen.findByRole("dialog")

    await userEvent.type(within(dialog).getByLabelText("Term name (optional)"), "Letní turnus 1")
    await userEvent.type(within(dialog).getByLabelText("Start date *"), "12/07/2027")
    await userEvent.type(within(dialog).getByLabelText("End date *"), "18/07/2027")
    await userEvent.type(within(dialog).getByLabelText("Term price (CZK) *"), "6900")
    await userEvent.click(within(dialog).getByRole("button", { name: "Add term" }))

    await waitFor(() => expect(success).toHaveBeenCalledWith("The term Letní turnus 1 was added."))
    expect(posts(fetchMock)).toHaveLength(1)
    expect(sentBodies[0]).toEqual({
      name: "Letní turnus 1",
      startsOn: "2027-07-12",
      endsOn: "2027-07-18",
      priceCzk: 6900,
    })
  })

  it("accepts a price of 0 for a free term", async () => {
    const success = vi.spyOn(notify, "success")
    renderTerms()
    await userEvent.click(await screen.findByRole("button", { name: "Add term" }))
    const dialog = await screen.findByRole("dialog")

    await userEvent.type(within(dialog).getByLabelText("Term name (optional)"), "Zdarma")
    await userEvent.type(within(dialog).getByLabelText("Start date *"), "12/07/2027")
    await userEvent.type(within(dialog).getByLabelText("End date *"), "18/07/2027")
    await userEvent.type(within(dialog).getByLabelText("Term price (CZK) *"), "0")
    await userEvent.click(within(dialog).getByRole("button", { name: "Add term" }))

    await waitFor(() => expect(success).toHaveBeenCalledWith("The term Letní turnus 1 was added."))
    expect(sentBodies[0]).toMatchObject({ priceCzk: 0 })
  })

  it("asks for a reason and shows what the cancellation affects", async () => {
    const fetchMock = renderTerms()
    const row = (await screen.findByText(/^Srpnový turnus · /)).closest("li") as HTMLElement
    await userEvent.click(within(row).getByRole("button", { name: "Actions for Srpnový turnus" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cancel term" }))
    const dialog = await screen.findByRole("dialog")

    expect(
      within(dialog).getByText("18 confirmed applications and 1 waitlisted"),
    ).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirm cancellation" }))

    expect(await within(dialog).findByText("Fill in this field.")).toBeInTheDocument()
    expect(posts(fetchMock)).toHaveLength(0)
  })
})
