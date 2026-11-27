// The real nodemailer against a minimal SMTP server: what counts as "certainly not sent".
import { createServer, Server, Socket } from "node:net"
import { SMTPAdapter } from "@/core/email/adapters/smtp/services/smtp-adapter"

type AfterData = (socket: Socket) => void

let server: Server | undefined

/** Accepts the whole message and then does what `afterData` says. */
async function smtpServer(afterData: AfterData): Promise<number> {
  server = createServer((socket) => {
    let isData = false
    socket.write("220 test\r\n")
    socket.on("data", (chunk) => {
      const text = chunk.toString()
      if (isData) {
        if (text.endsWith("\r\n.\r\n")) afterData(socket)
      } else if (text.startsWith("DATA")) {
        isData = true
        socket.write("354 go\r\n")
      } else if (text.startsWith("AUTH")) socket.write("235 ok\r\n")
      else if (text.startsWith("EHLO")) socket.write("250-test\r\n250 AUTH PLAIN\r\n")
      else socket.write("250 ok\r\n")
    })
  })
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve))
  return (server.address() as { port: number }).port
}

const send = (port: number): Promise<void> =>
  new SMTPAdapter({
    host: "127.0.0.1",
    port,
    secure: false,
    user: "togena@example.com",
    pass: "secret",
  }).sendEmail("jana@example.com", "Subject", "<p>Hello</p>")

describe("SMTPAdapter", () => {
  afterEach(() => {
    server?.close()
    server = undefined
  })

  it("sends a message the server accepts", async () => {
    const port = await smtpServer((socket) => socket.write("250 queued\r\n"))

    await expect(send(port)).resolves.toBeUndefined()
  })

  it("knows a refused message was not sent", async () => {
    const port = await smtpServer((socket) => socket.write("550 no\r\n"))

    await expect(send(port)).rejects.toMatchObject({ outcome: "NOT_SENT" })
  })

  it("does not know whether a message was sent when the connection drops after it", async () => {
    const port = await smtpServer((socket) => socket.destroy())

    await expect(send(port)).rejects.toMatchObject({ outcome: "UNKNOWN" })
  })

  it("knows nothing was sent when it cannot connect", async () => {
    const port = await smtpServer(() => undefined)
    await new Promise((resolve) => server!.close(resolve))

    await expect(send(port)).rejects.toMatchObject({ outcome: "NOT_SENT" })
  })
})
