import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { i18n } from "@/i18n"
import { roomCapacityIncreaseKey } from "@/lib/room-capacity-increase"

import { CapacityPage } from "@/features/event-overview/components/CapacityPage"

const figures = (overrides: object) => ({
  capacity: 0,
  confirmed: 0,
  free: 0,
  waitlisted: 0,
  ...overrides,
})
const base = { id: "t1", name: "Letní turnus 1", startsOn: "2027-07-12", endsOn: "2027-07-18" }

const gendered = {
  eventId: "e1",
  terms: [
    {
      ...base,
      roomMode: "GENDERED",
      roomCount: 2,
      ...figures({ capacity: 10, confirmed: 7, free: 3, waitlisted: 2 }),
      byGender: {
        FEMALE: figures({ capacity: 5, confirmed: 2, free: 3, waitlisted: 0 }),
        MALE: figures({ capacity: 5, confirmed: 5, free: 0, waitlisted: 4 }),
      },
    },
  ],
}
const shared = {
  eventId: "e1",
  terms: [
    {
      ...base,
      roomMode: "SHARED",
      roomCount: 2,
      ...figures({ capacity: 100, confirmed: 78, free: 22, waitlisted: 3 }),
      byGender: null,
    },
  ],
}

function renderPage(
  body: unknown,
  status = 200,
  props: {
    termId?: string
    rooms?: { gender: "FEMALE" | "MALE" | null; beds: number }[]
  } = {},
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  )
  const rootRoute = createRootRoute()
  const page = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => (
      <CapacityPage
        eventId="e1"
        {...props}
      />
    ),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(async () => {
  vi.restoreAllMocks()
  await act(() => i18n.changeLanguage("en"))
})

describe("CapacityPage", () => {
  it.each([
    ["t1", 5, true],
    ["other-term", 5, false],
    ["t1", 99, false],
  ] as const)(
    "shows the room increase only for the saved term and matching totals (%s, %i)",
    async (id, femaleBeds, isShown) => {
      const client = new QueryClient()
      client.setQueryData(roomCapacityIncreaseKey("e1", id), {
        gender: "FEMALE",
        addedBeds: 2,
        capacity: { FEMALE: femaleBeds, MALE: 5, total: femaleBeds + 5 },
      })
      renderPage(gendered, 200, { termId: "t1" }, client)
      await screen.findByText("2 / 5")
      expect(Boolean(screen.queryByText("Women's capacity increased by 2 beds"))).toBe(isShown)
    },
  )

  it("lists every term with bars for women and men and no percent text", async () => {
    renderPage(gendered)

    expect(await screen.findByRole("heading", { name: "Occupancy of all terms" })).toBeVisible()
    expect(screen.getByText("2 / 5")).toBeVisible()
    expect(screen.getByText("5 / 5")).toBeVisible()
    expect(screen.getAllByRole("progressbar")).toHaveLength(2)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it("makes the whole row a link to the term detail", async () => {
    renderPage(gendered)

    const row = await screen.findByRole("link", { name: /Letní turnus 1/ })
    expect(row.getAttribute("href")).toContain("termId=t1")
    // The numbers are not links of their own.
    expect(screen.queryByRole("link", { name: "2" })).not.toBeInTheDocument()
  })

  it("shows one bar and the free places per term with shared rooms", async () => {
    renderPage(shared)

    expect(await screen.findByText("78 / 100")).toBeVisible()
    expect(screen.getByText("22")).toBeVisible()
    expect(screen.getAllByRole("progressbar")).toHaveLength(1)
  })

  it("opens the detail of a term with cards linking to the confirmed applications", async () => {
    renderPage(gendered, 200, {
      termId: "t1",
      rooms: [
        { gender: "FEMALE", beds: 5 },
        { gender: "MALE", beds: 5 },
      ],
    })

    expect(await screen.findByRole("heading", { name: "Letní turnus 1" })).toBeVisible()
    expect(screen.getByRole("link", { name: "All terms" }).getAttribute("href")).not.toContain(
      "termId",
    )
    const women = screen.getByRole("link", { name: /Women · capacity 5 beds.*View applications/ })
    expect(
      screen.getByRole("heading", { name: /Women · capacity 5 beds/ }).parentElement,
    ).toHaveTextContent("2 / 5")
    expect(
      screen.getByRole("heading", { name: /Women · capacity 5 beds/ }).parentElement,
    ).toHaveTextContent("3 free places · 1 women’s room of 5 beds")
    for (const part of ["term=t1", "status=CONFIRMED", "gender=FEMALE"]) {
      expect(women.getAttribute("href")).toContain(part)
    }
    expect(
      screen
        .getByRole("link", { name: /Women · capacity 5 beds.*Waitlisted/ })
        .getAttribute("href"),
    ).toContain("status=WAITLISTED")
    expect(
      screen.getByRole("heading", { name: /Total term capacity/ }).parentElement,
    ).toHaveTextContent("7 / 10")
    expect(screen.getByText("Free places for women cannot be used for men.")).toBeVisible()
    expect(screen.getByText(/3 places left in total, all for women/)).toBeVisible()
  })

  it("warns when more are confirmed than there are beds", async () => {
    const over = structuredClone(gendered)
    over.terms[0]!.byGender.MALE = figures({ capacity: 5, confirmed: 6, free: -1, waitlisted: 0 })
    renderPage(over, 200, { termId: "t1" })

    expect(await screen.findByText("Term capacity exceeded")).toBeVisible()
    expect(screen.getByText(/Men: 6 confirmed for 5 beds/)).toBeVisible()
  })

  describe("bed counts agree with the number", () => {
    const womenBeds = [
      { beds: 1, cs: "lůžko", en: "bed" },
      { beds: 2, cs: "lůžka", en: "beds" },
      { beds: 4, cs: "lůžka", en: "beds" },
      { beds: 0, cs: "lůžek", en: "beds" },
      { beds: 5, cs: "lůžek", en: "beds" },
      { beds: 22, cs: "lůžek", en: "beds" },
    ]
    const withWomenBeds = (beds: number) => {
      const body = structuredClone(gendered)
      body.terms[0]!.byGender.FEMALE = figures({ capacity: beds, free: beds })
      return body
    }

    it.each(womenBeds)("in Czech for $beds women's beds", async ({ beds, cs }) => {
      await act(() => i18n.changeLanguage("cs"))
      renderPage(withWomenBeds(beds), 200, { termId: "t1" })

      expect(await screen.findByText(`${beds} ${cs} pro ženy · 5 pro muže`)).toBeVisible()
      expect(
        screen.getByRole("link", { name: `Ženy · kapacita ${beds} ${cs} · Zobrazit přihlášky` }),
      ).toBeVisible()
    })

    it.each(womenBeds)("in English for $beds women's beds", async ({ beds, en }) => {
      renderPage(withWomenBeds(beds), 200, { termId: "t1" })

      expect(await screen.findByText(`${beds} ${en} for women · 5 for men`)).toBeVisible()
      expect(
        screen.getByRole("link", { name: `Women · capacity ${beds} ${en} · View applications` }),
      ).toBeVisible()
    })

    it.each([
      { beds: 1, cs: "lůžko", en: "bed" },
      { beds: 3, cs: "lůžka", en: "beds" },
      { beds: 8, cs: "lůžek", en: "beds" },
    ])("in the over-capacity warning for $beds beds", async ({ beds, cs, en }) => {
      const over = structuredClone(gendered)
      over.terms[0]!.byGender.MALE = figures({ capacity: beds, confirmed: beds + 1, free: -1 })

      await act(() => i18n.changeLanguage("cs"))
      renderPage(over, 200, { termId: "t1" })
      expect(
        await screen.findByText(
          `Muži: potvrzeno ${beds + 1} na ${beds} ${cs}. Kapacita je překročena o 1.`,
        ),
      ).toBeVisible()
      cleanup()

      await act(() => i18n.changeLanguage("en"))
      renderPage(over, 200, { termId: "t1" })
      expect(
        await screen.findByText(
          `Men: ${beds + 1} confirmed for ${beds} ${en}. Capacity exceeded by 1.`,
        ),
      ).toBeVisible()
    })
  })

  it("explains an unfinished event without terms and offers to add one", async () => {
    renderPage({ ...shared, terms: [] })
    expect(await screen.findByText("The event is not finished yet")).toBeTruthy()
    expect(screen.getByRole("link", { name: "Add term and price" })).toBeTruthy()
    expect(screen.queryByText(/Capacity comes from the beds/)).toBeNull()
  })

  it("explains an unfinished event without rooms instead of showing empty bars", async () => {
    renderPage({
      ...gendered,
      terms: gendered.terms.map((term) => ({ ...term, roomCount: 0 })),
    })
    expect(await screen.findByText("The event is not finished yet")).toBeTruthy()
    expect(screen.getByText(/no rooms/)).toBeTruthy()
    expect(screen.getByRole("link", { name: "Add room" })).toBeTruthy()
    expect(screen.queryByRole("link", { name: "Add term and price" })).toBeNull()
  })

  it("shows an error state", async () => {
    renderPage({ statusCode: 500, code: "INTERNAL", message: "Boom" }, 500)
    expect(await screen.findByRole("alert")).toBeTruthy()
  })
})
