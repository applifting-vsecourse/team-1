import { EmailDeliveryError } from "@/core/email/interfaces/email-delivery.error"
import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { MAX_ATTEMPTS } from "@/core/email/queue/delivery-policy"
import { ClaimedEmailJob, EmailJobRepository } from "@/core/email/queue/email-job.repository"
import { EmailQueueWorker } from "@/core/email/queue/email-queue.worker"
import { Logger } from "@nestjs/common"

type Row = ClaimedEmailJob & { status: string; nextAttemptAt: Date; error?: string }

const START = new Date("2026-11-27T10:00:00Z")
const later = (hours: number): Date => new Date(START.getTime() + hours * 3_600_000)

/** In memory; a job left SENDING counts as abandoned an hour after its first attempt. */
class FakeJobs extends EmailJobRepository {
  readonly rows: Row[]

  constructor(recipients: string[]) {
    super()
    this.rows = recipients.map((recipient, index) => ({
      id: `job-${index}`,
      dedupeKey: `change:${index}`,
      recipient,
      payload: {},
      content: null,
      attempts: 0,
      firstAttemptAt: START,
      mayHaveBeenSent: false,
      isAbandoned: false,
      status: "PENDING",
      nextAttemptAt: START,
    }))
  }

  async claimNext(now: Date): Promise<ClaimedEmailJob | null> {
    const row = this.rows.find(
      (job) =>
        (job.status === "PENDING" && job.nextAttemptAt <= now) ||
        (job.status === "SENDING" && now >= later(1)),
    )
    if (!row) return null
    row.isAbandoned = row.status === "SENDING"
    row.status = "SENDING"
    row.attempts += 1
    return { ...row }
  }

  async saveContent(id: string, content: Row["content"]): Promise<void> {
    this.row(id).content = content
  }

  async markSent(id: string): Promise<void> {
    this.row(id).status = "SENT"
  }

  async scheduleRetry(
    id: string,
    retry: { nextAttemptAt: Date; mayHaveBeenSent: boolean; error: string },
  ): Promise<void> {
    Object.assign(this.row(id), { ...retry, status: "PENDING" })
  }

  async giveUp(id: string, status: "FAILED" | "UNCERTAIN", error: string): Promise<void> {
    Object.assign(this.row(id), { status, error })
  }

  row(id: string): Row {
    return this.rows.find((row) => row.id === id)!
  }
}

describe("EmailQueueWorker", () => {
  const sendEmail = jest.fn()
  const render = jest.fn(async (job: ClaimedEmailJob) => ({
    subject: "Subject",
    html: job.recipient,
  }))
  const worker = (jobs: FakeJobs, isIdempotent = true) =>
    new EmailQueueWorker(jobs, { isIdempotent, sendEmail } as EmailService, render, 0)
  const recipients = () => sendEmail.mock.calls.map(([to]) => to)

  beforeEach(() => {
    sendEmail.mockReset().mockResolvedValue(undefined)
    render.mockClear()
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
  })

  it("sends every recipient exactly once, also when run again", async () => {
    const jobs = new FakeJobs(["a@example.com", "b@example.com", "c@example.com"])

    await worker(jobs).drain(() => START)
    await worker(jobs).drain(() => later(2))

    expect(recipients()).toEqual(["a@example.com", "b@example.com", "c@example.com"])
    expect(jobs.rows.map((row) => row.status)).toEqual(["SENT", "SENT", "SENT"])
  })

  it("records a failure, goes on with the others and retries only the failed one", async () => {
    const jobs = new FakeJobs(["a@example.com", "b@example.com"])
    sendEmail.mockRejectedValueOnce(new EmailDeliveryError("outage", "NOT_SENT"))

    await worker(jobs).drain(() => START)
    expect(jobs.rows[0]).toMatchObject({ status: "PENDING", error: "outage", attempts: 1 })
    expect(jobs.rows[1].status).toBe("SENT")

    await worker(jobs).drain(() => later(1))
    expect(recipients()).toEqual(["a@example.com", "b@example.com", "a@example.com"])
    expect(jobs.rows[0].status).toBe("SENT")
    expect(render).toHaveBeenCalledTimes(2)
  })

  it("gives up after the last attempt", async () => {
    const jobs = new FakeJobs(["a@example.com"])
    sendEmail.mockRejectedValue(new EmailDeliveryError("outage", "NOT_SENT"))

    for (let day = 0; day <= MAX_ATTEMPTS; day++) await worker(jobs).drain(() => later(day * 24))

    expect(sendEmail).toHaveBeenCalledTimes(MAX_ATTEMPTS)
    expect(jobs.rows[0].status).toBe("FAILED")
  })

  it("after a restart repeats an abandoned send with the same key where the provider allows it", async () => {
    const jobs = new FakeJobs(["a@example.com"])
    await jobs.claimNext(START) // the worker that died while sending
    await jobs.saveContent("job-0", { subject: "Subject", html: "a@example.com" })

    await worker(jobs).drain(() => later(1))

    expect(sendEmail).toHaveBeenCalledWith("a@example.com", "Subject", "a@example.com", {
      idempotencyKey: "change:0",
    })
    expect(jobs.rows[0].status).toBe("SENT")
  })

  it.each([
    ["the provider cannot tell a repeat", false, 1],
    ["the provider has forgotten the key", true, 24],
  ])("does not repeat an abandoned send when %s", async (_, isIdempotent, hours) => {
    const jobs = new FakeJobs(["a@example.com"])
    await jobs.claimNext(START)
    await jobs.saveContent("job-0", { subject: "Subject", html: "a@example.com" })

    await worker(jobs, isIdempotent).drain(() => later(hours))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(jobs.rows[0].status).toBe("UNCERTAIN")
  })

  it("sends a job abandoned before it was rendered, whatever the provider", async () => {
    const jobs = new FakeJobs(["a@example.com"])
    await jobs.claimNext(START)

    await worker(jobs, false).drain(() => later(1))

    expect(jobs.rows[0].status).toBe("SENT")
  })

  it("does not repeat a send with an unknown result without idempotency", async () => {
    const jobs = new FakeJobs(["a@example.com"])
    sendEmail.mockRejectedValue(new Error("connection reset"))

    await worker(jobs, false).drain(() => START)

    expect(jobs.rows[0].status).toBe("UNCERTAIN")
  })

  it("records a template that cannot be rendered without sending anything", async () => {
    const jobs = new FakeJobs(["a@example.com"])
    render.mockRejectedValueOnce(new Error("broken data"))

    await worker(jobs).drain(() => START)

    expect(sendEmail).not.toHaveBeenCalled()
    expect(jobs.rows[0]).toMatchObject({ status: "PENDING", error: "broken data" })
  })
})
