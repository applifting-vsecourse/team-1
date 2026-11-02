import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { type OrganizerEvent } from "@/features/events/api/events"
import { PublicPageForm } from "@/features/events/components/PublicPageForm"

// Radix's checkbox measures things jsdom doesn't have.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

const event: OrganizerEvent = {
  id: "e1",
  organizationId: "o1",
  organizationName: "Alpine Collective",
  name: "Letní kemp Lipno 2027",
  description: "Týden v přírodě.",
  location: "Lipno nad Vltavou",
  contactEmail: "info@alpine.example",
  contactPhone: "+420 000 000 000",
  publishedInCatalog: false,
  photoFileName: null,
  publicToken: "tok123",
  createdAt: "2027-01-01T10:00:00.000Z",
  termCount: 2,
  startsOn: "2027-07-12",
  endsOn: "2027-07-25",
  applicationsOpen: false,
  evaluationMode: "AUTOMATIC",
  evaluationModeLocked: false,
  missing: [],
  terms: [],
}

const term = (
  id: string,
  startsOn: string,
  endsOn: string,
  priceCzk: number,
  cancelledAt = null,
) => ({
  id,
  eventId: "e1",
  name: id,
  startsOn,
  endsOn,
  priceCzk,
  roomMode: "GENDERED",
  roomCount: 1,
  capacity: 10,
  confirmedCount: 0,
  waitlistedCount: 0,
  cancelledAt,
  cancelReason: null,
})

type Sent = { method: string; url: string; body: unknown; headers: Headers }

function renderForm(
  current: OrganizerEvent = event,
  respond: (sent: Sent) => Response = () => new Response(JSON.stringify(current)),
) {
  const sent: Sent[] = []
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const request = input as Request
    if (request.method === "GET") {
      return new Response(
        JSON.stringify([
          term("t1", "2027-07-12", "2027-07-18", 4900),
          term("t2", "2027-07-19", "2027-07-25", 5600),
          term("t3", "2027-08-01", "2027-08-07", 1, "2027-02-01T00:00:00.000Z" as never),
        ]),
        { headers: { "Content-Type": "application/json" } },
      )
    }
    const isImage = request.headers.get("Content-Type")?.startsWith("image/")
    const item = {
      method: request.method,
      url: request.url,
      body: isImage ? await request.clone().blob() : ((await request.clone().json()) as unknown),
      headers: request.headers,
    }
    sent.push(item)
    return respond(item)
  })
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PublicPageForm event={current} />
    </QueryClientProvider>,
  )
  return sent
}

const choosePhoto = (file: File) =>
  userEvent.upload(screen.getByTestId("upload-input"), file, { applyAccept: false })

afterEach(() => vi.restoreAllMocks())

describe("PublicPageForm", () => {
  it("shows the saved content with the catalog switched off by default", () => {
    renderForm()

    expect(screen.getByLabelText("Event name")).toHaveValue("Letní kemp Lipno 2027")
    expect(screen.getByLabelText("Description")).toHaveValue("Týden v přírodě.")
    expect(screen.getByLabelText("Venue")).toHaveValue("Lipno nad Vltavou")
    expect(screen.getByLabelText("Contact e-mail")).toHaveValue("info@alpine.example")
    expect(screen.getByLabelText("Contact phone")).toHaveValue("+420 000 000 000")
    expect(
      screen.getByRole("checkbox", { name: "List the event in the catalog" }),
    ).not.toBeChecked()
    expect(screen.getByText("Add an event photo")).toBeInTheDocument()
  })

  it("lists the offered terms with their prices, not the cancelled ones", async () => {
    renderForm()

    expect(await screen.findByText(/12.*18 Jul 2027 · CZK 4,900/)).toBeInTheDocument()
    expect(screen.getByText(/19.*25 Jul 2027 · CZK 5,600/)).toBeInTheDocument()
    expect(screen.queryByText(/CZK 1$/)).not.toBeInTheDocument()
  })

  it("saves the edited content and confirms it", async () => {
    const saved = { ...event, location: "Praha", publishedInCatalog: true }
    const sent = renderForm(event, () => new Response(JSON.stringify(saved)))
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText("Venue"))
    await user.type(screen.getByLabelText("Venue"), "Praha")
    await user.click(screen.getByRole("checkbox", { name: "List the event in the catalog" }))
    await user.click(screen.getByRole("button", { name: "Save public details" }))

    await vi.waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]!.method).toBe("PUT")
    expect(sent[0]!.url).toContain("/organizer/events/e1/public-page")
    expect(sent[0]!.body).toEqual({
      name: "Letní kemp Lipno 2027",
      description: "Týden v přírodě.",
      location: "Praha",
      contactEmail: "info@alpine.example",
      contactPhone: "+420 000 000 000",
      publishedInCatalog: true,
    })
    expect(await screen.findByText("Public details are saved.")).toBeInTheDocument()
  })

  it("shows the translated server error and no confirmation", async () => {
    renderForm(
      event,
      () =>
        new Response(JSON.stringify({ statusCode: 400, code: "PUBLIC_PAGE_INCOMPLETE" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole("checkbox", { name: "List the event in the catalog" }))
    await user.click(screen.getByRole("button", { name: "Save public details" }))

    expect(await screen.findByText(/before listing the event in the catalog/)).toBeInTheDocument()
    expect(screen.queryByText("Public details are saved.")).not.toBeInTheDocument()
  })

  it("puts the saved content back on Cancel", async () => {
    renderForm()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Venue"), " u řeky")
    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.getByLabelText("Venue")).toHaveValue("Lipno nad Vltavou")
  })

  it("sends a chosen photo at once and shows it as uploaded", async () => {
    const withPhoto = { ...event, photoFileName: "lipno-2027.jpg" }
    const sent = renderForm(event, () => new Response(JSON.stringify(withPhoto)))

    await choosePhoto(new File(["jpg"], "lipno-2027.jpg", { type: "image/jpeg" }))

    await vi.waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]!.url).toContain("/organizer/events/e1/photo")
    expect(sent[0]!.headers.get("Content-Type")).toBe("image/jpeg")
    expect(sent[0]!.headers.get("X-File-Name")).toBe("lipno-2027.jpg")
  })

  it("shows an uploaded photo with its file name", () => {
    renderForm({ ...event, photoFileName: "lipno-2027.jpg" })

    expect(screen.getByText("Photo uploaded")).toBeInTheDocument()
    expect(screen.getByText("lipno-2027.jpg")).toBeInTheDocument()
    expect(screen.getByText("Done")).toBeInTheDocument()
  })

  it("refuses a photo of the wrong type without sending it", async () => {
    const sent = renderForm()

    await choosePhoto(new File(["gif"], "anim.gif", { type: "image/gif" }))

    expect(await screen.findByText("The photo could not be uploaded")).toBeInTheDocument()
    expect(sent).toHaveLength(0)
  })

  it("refuses a photo over 2 MB without sending it", async () => {
    const sent = renderForm()
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" })

    await choosePhoto(big)

    expect(await screen.findByText("The photo could not be uploaded")).toBeInTheDocument()
    expect(sent).toHaveLength(0)
  })

  it("shows the photo error when the server refuses the upload, and lets another one be chosen", async () => {
    let calls = 0
    const withPhoto = { ...event, photoFileName: "ok.png" }
    renderForm(event, () => {
      calls += 1
      return calls === 1
        ? new Response(JSON.stringify({ statusCode: 413, code: "PHOTO_TOO_LARGE" }), {
            status: 413,
            headers: { "Content-Type": "application/json" },
          })
        : new Response(JSON.stringify(withPhoto))
    })

    await choosePhoto(new File(["png"], "a.png", { type: "image/png" }))
    const error = await screen.findByText("The photo could not be uploaded")
    expect(within(error.parentElement!).getByRole("button", { name: "Choose photo" })).toBeEnabled()

    await choosePhoto(new File(["png"], "ok.png", { type: "image/png" }))
    await vi.waitFor(() => expect(calls).toBe(2))
    expect(screen.queryByText("The photo could not be uploaded")).not.toBeInTheDocument()
  })
})
