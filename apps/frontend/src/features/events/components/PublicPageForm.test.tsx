import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { notify } from "@/lib/notify"

import { type OrganizerEvent } from "@/features/events/api/events"
import { PublicPageForm } from "@/features/events/components/PublicPageForm"

vi.mock("@/lib/notify", () => ({
  notify: { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))

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

const json = { headers: { "Content-Type": "application/json" } }
const jsonError = (statusCode: number, code: string) =>
  new Response(JSON.stringify({ statusCode, code }), { status: statusCode, ...json })

function renderForm(
  current: OrganizerEvent = event,
  respond: (sent: Sent) => Response = () => new Response(JSON.stringify(current)),
) {
  const sent: Sent[] = []
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const request = input as Request
    if (request.method === "GET") {
      if (request.url.endsWith("/photo")) {
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          headers: { "Content-Type": "image/png" },
        })
      }
      return new Response(
        JSON.stringify([
          term("t1", "2027-07-12", "2027-07-18", 4900),
          term("t2", "2027-07-19", "2027-07-25", 5600),
          term("t3", "2027-08-01", "2027-08-07", 1, "2027-02-01T00:00:00.000Z" as never),
        ]),
        json,
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

const open = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Public details" }))

const choosePhoto = (file: File) =>
  userEvent.upload(screen.getByTestId("upload-input"), file, { applyAccept: false })

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe("PublicPageForm", () => {
  it("is closed until the section is opened", async () => {
    renderForm()
    const user = userEvent.setup()

    expect(screen.getByRole("button", { name: "Public details" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    expect(screen.queryByLabelText("Event name")).not.toBeInTheDocument()

    await open(user)

    expect(screen.getByLabelText("Event name")).toHaveValue("Letní kemp Lipno 2027")
  })

  it("shows the saved content with the catalog switched off by default", async () => {
    renderForm()
    await open(userEvent.setup())

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
    await open(userEvent.setup())

    expect(await screen.findByText(/12.*18 Jul 2027 · CZK 4,900/)).toBeInTheDocument()
    expect(screen.getByText(/19.*25 Jul 2027 · CZK 5,600/)).toBeInTheDocument()
    expect(screen.queryByText(/CZK 1$/)).not.toBeInTheDocument()
  })

  it("saves the edited content, closes the section and confirms with a toast", async () => {
    const saved = { ...event, location: "Praha", publishedInCatalog: true }
    const sent = renderForm(event, () => new Response(JSON.stringify(saved)))
    const user = userEvent.setup()
    await open(user)

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
    await vi.waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith(
        "Public details are saved.",
        "The event is listed in the catalog.",
      ),
    )
    expect(screen.getByRole("button", { name: "Public details" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })

  it("shows what is wrong under the fields and sends nothing", async () => {
    const sent = renderForm()
    const user = userEvent.setup()
    await open(user)

    await user.clear(screen.getByLabelText("Event name"))
    await user.clear(screen.getByLabelText("Contact e-mail"))
    await user.type(screen.getByLabelText("Contact e-mail"), "nope")
    await user.clear(screen.getByLabelText("Contact phone"))
    await user.type(screen.getByLabelText("Contact phone"), "abc")
    await user.click(screen.getByRole("button", { name: "Save public details" }))

    expect(await screen.findByText("Enter the event name.")).toBeInTheDocument()
    expect(screen.getByText("Enter a valid e-mail address.")).toBeInTheDocument()
    expect(screen.getByText(/Enter a valid phone number/)).toBeInTheDocument()
    expect(screen.getByLabelText("Contact e-mail")).toHaveAccessibleDescription(
      "Enter a valid e-mail address.",
    )
    expect(sent).toHaveLength(0)

    await user.type(screen.getByLabelText("Event name"), "Kemp")
    expect(screen.queryByText("Enter the event name.")).not.toBeInTheDocument()
  })

  it("asks for description, venue and e-mail before the catalog", async () => {
    const sent = renderForm({ ...event, description: null, location: null, contactEmail: null })
    const user = userEvent.setup()
    await open(user)

    await user.click(screen.getByRole("checkbox", { name: "List the event in the catalog" }))
    await user.click(screen.getByRole("button", { name: "Save public details" }))

    expect(
      await screen.findAllByText("Fill this in before listing the event in the catalog."),
    ).toHaveLength(3)
    expect(sent).toHaveLength(0)
  })

  it("shows a server error above the buttons and keeps the section open", async () => {
    renderForm(event, () => jsonError(500, "INTERNAL"))
    const user = userEvent.setup()
    await open(user)

    await user.click(screen.getByRole("button", { name: "Save public details" }))

    expect(await screen.findByText("The public details could not be saved")).toBeInTheDocument()
    expect(notify.success).not.toHaveBeenCalled()
  })

  it("closes the section and puts the saved content back on Cancel", async () => {
    renderForm()
    const user = userEvent.setup()
    await open(user)

    await user.type(screen.getByLabelText("Venue"), " u řeky")
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByLabelText("Venue")).not.toBeInTheDocument()

    await open(user)
    expect(screen.getByLabelText("Venue")).toHaveValue("Lipno nad Vltavou")
  })

  it("sends a chosen photo at once and confirms it", async () => {
    const withPhoto = { ...event, photoFileName: "lipno-2027.jpg" }
    const sent = renderForm(event, () => new Response(JSON.stringify(withPhoto)))
    await open(userEvent.setup())

    await choosePhoto(new File(["jpg"], "lipno-2027.jpg", { type: "image/jpeg" }))

    await vi.waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]!.url).toContain("/organizer/events/e1/photo")
    expect(sent[0]!.headers.get("Content-Type")).toBe("image/jpeg")
    expect(sent[0]!.headers.get("X-File-Name")).toBe("lipno-2027.jpg")
    await vi.waitFor(() => expect(notify.success).toHaveBeenCalledWith("Photo uploaded"))
  })

  it("shows an uploaded photo with its preview and file name", async () => {
    renderForm({ ...event, photoFileName: "lipno-2027.jpg" })
    await open(userEvent.setup())

    expect(screen.getByText("Photo uploaded")).toBeInTheDocument()
    expect(screen.getByText("lipno-2027.jpg")).toBeInTheDocument()
    await vi.waitFor(() =>
      expect(document.body.querySelector("img")?.getAttribute("src")).toMatch(/^data:image\/png/),
    )
  })

  it("explains a photo of the wrong type under the upload and sends nothing", async () => {
    const sent = renderForm()
    await open(userEvent.setup())

    await choosePhoto(new File(["gif"], "anim.gif", { type: "image/gif" }))

    expect(
      await screen.findByText("The photo has to be a JPG, JPEG or PNG image."),
    ).toBeInTheDocument()
    expect(sent).toHaveLength(0)
  })

  it("explains a photo over 2 MB under the upload and sends nothing", async () => {
    const sent = renderForm()
    await open(userEvent.setup())
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" })

    await choosePhoto(big)

    expect(await screen.findByText(/The photo is too large/)).toBeInTheDocument()
    expect(sent).toHaveLength(0)
  })

  it("shows the server's reason when it refuses the photo, and lets another be chosen", async () => {
    let calls = 0
    const withPhoto = { ...event, photoFileName: "ok.png" }
    renderForm(event, () => {
      calls += 1
      return calls === 1
        ? jsonError(413, "PHOTO_TOO_LARGE")
        : new Response(JSON.stringify(withPhoto))
    })
    await open(userEvent.setup())

    await choosePhoto(new File(["png"], "a.png", { type: "image/png" }))
    expect(await screen.findByText(/The photo is too large/)).toBeInTheDocument()

    await choosePhoto(new File(["png"], "ok.png", { type: "image/png" }))
    await vi.waitFor(() => expect(calls).toBe(2))
    await vi.waitFor(() =>
      expect(screen.queryByText(/The photo is too large/)).not.toBeInTheDocument(),
    )
  })
})
