import { ResendAdapter } from "@/core/email/adapters/resend/services/resend-adapter"

const send = jest.fn()
jest.mock("resend", () => ({ Resend: jest.fn(() => ({ emails: { send } })) }))

describe("ResendAdapter", () => {
  const adapter = new ResendAdapter({ apiKey: "key", from: "Togena <a@example.com>" })

  beforeEach(() => send.mockReset().mockResolvedValue({ error: null }))

  it("hands the idempotency key to Resend", async () => {
    await adapter.sendEmail("jana@example.com", "Subject", "<p/>", { idempotencyKey: "job-1" })

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "jana@example.com" }), {
      idempotencyKey: "job-1",
    })
  })

  it.each([
    ["rate_limit_exceeded", 429, "NOT_SENT"],
    ["validation_error", 422, "NOT_SENT"],
    ["application_error", null, "UNKNOWN"],
    ["internal_server_error", 500, "UNKNOWN"],
    ["concurrent_idempotent_requests", 409, "UNKNOWN"],
    ["invalid_idempotent_request", 409, "CONFLICT"],
  ])("reads %s (%s) as %s", async (name, statusCode, outcome) => {
    send.mockResolvedValue({ error: { name, statusCode, message: "no" } })

    await expect(adapter.sendEmail("jana@example.com", "S", "<p/>")).rejects.toMatchObject({
      outcome,
    })
  })
})
