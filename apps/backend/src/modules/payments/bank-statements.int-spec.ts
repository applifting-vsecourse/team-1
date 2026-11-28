import { randomUUID } from "node:crypto"
import { PrismaEmailJobRepository } from "@/core/email/queue/prisma-email-job.repository"
import { PrismaService } from "@/core/prisma/prisma.service"
import { NotificationsRepository } from "@/modules/notifications/repositories/notifications.repository"
import { QueuedEmail } from "@/modules/participants/domain/queued-email"
import { QueuedEmailRepository } from "@/modules/participants/repositories/queued-email.repository"
import { PaymentsRepository } from "@/modules/payments/repositories/payments.repository"
import {
  allEmailsTo,
  api,
  connectTestPrisma,
  hasSentNothingTo,
  latestEmailTo,
  resetAndSeed,
  signIn,
} from "@/test/integration/test-api"

type ImportResult = {
  matchedCount: number
  matchedCzk: number
  unmatchedCount: number
  overpaidCount: number
  overpaidCzk: number
  duplicateCount: number
  ignoredCount: number
}

describe("bank statement import (US-42)", () => {
  let prisma: PrismaService
  let cookie: string
  let eventId: string
  let numbers: { first: number; second: number }
  let firstTerm: { id: string; number: number }

  const upload = (
    csv: string,
    auth: string | undefined = cookie,
    id = eventId,
  ): Promise<Response> =>
    fetch(api(`/organizer/events/${id}/bank-statements`), {
      method: "POST",
      headers: { "Content-Type": "text/csv", ...(auth ? { Cookie: auth } : {}) },
      body: csv,
    })

  const statement = (id: string, rows: [amount: number, vs: string, currency?: string][]): string =>
    [
      "ID operace;Datum;Objem;Měna;Protiúčet;Název protiúčtu;Kód banky;Název banky;KS;VS;SS;Poznámka;Zpráva pro příjemce;Typ",
      ...rows.map(
        ([amount, vs, currency = "CZK"], index) =>
          `${id}${index};05.05.2026;${amount};${currency};1;Test Payer;800;CS;;${vs};;;;Platba`,
      ),
    ].join("\r\n")

  const createApplication = async (confirmed: boolean, lastName = "Test"): Promise<number> => {
    const event = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { terms: { orderBy: { startsOn: "asc" } } },
    })
    const application = await prisma.application.create({
      data: {
        organizationId: event.organizationId,
        eventId,
        accessToken: `bank-test-${randomUUID()}`,
        firstName: "Bank",
        lastName,
        birthDate: new Date("2000-01-01"),
        gender: "FEMALE",
        email: `bank-${randomUUID()}@example.com`,
        consentAt: new Date(),
        terms: {
          create: [
            {
              organizationId: event.organizationId,
              termId: event.terms[0].id,
              status: confirmed ? "CONFIRMED" : "WAITLISTED",
              priceCzk: 6900,
            },
          ],
        },
      },
    })
    firstTerm = { id: event.terms[0].id, number: event.terms[0].number }
    return application.number
  }

  /**
   * E-mail no. 8 of a bank payment goes through the queue (#737). Waits until no job of the
   * recipient is waiting, so a second queued e-mail cannot hide behind the first one.
   */
  const expectOnePaymentEmail = async (email: string): Promise<void> => {
    const jobs = () => prisma.emailJob.findMany({ where: { recipient: email } })
    const deadline = Date.now() + 10_000
    let queued = await jobs()
    while (queued.some((job) => job.status === "PENDING" || job.status === "SENDING")) {
      if (Date.now() > deadline) throw new Error("The queue did not send the e-mails in time")
      await new Promise((resolve) => setTimeout(resolve, 100))
      queued = await jobs()
    }
    expect(queued).toMatchObject([{ template: "PAYMENT_RECEIVED", status: "SENT", attempts: 1 }])
    await latestEmailTo(email)
    // Time for a second e-mail sent around the queue to reach the console.
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(allEmailsTo(email)).toHaveLength(1)
  }

  beforeAll(async () => {
    prisma = await connectTestPrisma()
    await resetAndSeed(prisma)
    cookie = await signIn("organizator@example.com", "password1")
    eventId = (
      await prisma.event.findUniqueOrThrow({ where: { publicToken: "demo-letni-kemp-2027" } })
    ).id
    numbers = { first: await createApplication(true), second: await createApplication(false) }
  })
  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("matches by variable symbol, keeps the rest with a reason, and counts a re-upload once", async () => {
    const vs = numbers.first * 1000 + firstTerm.number
    const waitlistedVs = numbers.second * 1000 + firstTerm.number
    const id = String(Date.now())
    const csv = statement(id, [
      [7000, String(vs)],
      [100, String(waitlistedVs)],
      [200, ""],
      [300, "9999999001"],
      [400, String(vs), "EUR"],
      [-50, String(vs)],
    ])
    const response = await upload(csv)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      matchedCount: 2,
      matchedCzk: 7100,
      overpaidCount: 2,
      overpaidCzk: 200,
      unmatchedCount: 3,
      // The 400 EUR are not crowns.
      unmatchedCzk: 500,
      duplicateCount: 0,
      ignoredCount: 1,
    })
    const rows = await prisma.payment.findMany({
      where: { applicationTerm: { application: { number: numbers.first } } },
    })
    expect(rows).toMatchObject([{ amountCzk: 7000, source: "BANK_IMPORT" }])
    // D-088: money for a term without a debt stays with its application as an overpayment.
    expect(
      await prisma.payment.count({
        where: { applicationTerm: { application: { number: numbers.second } }, amountCzk: 100 },
      }),
    ).toBe(1)

    const again = (await (await upload(csv)).json()) as ImportResult
    expect(again).toMatchObject({ matchedCount: 0, unmatchedCount: 3, duplicateCount: 2 })
    expect(
      await prisma.payment.count({
        where: { applicationTerm: { application: { number: numbers.first } } },
      }),
    ).toBe(1)

    const unmatched = (await (
      await fetch(api(`/organizer/events/${eventId}/bank-transactions/unmatched`), {
        headers: { Cookie: cookie },
      })
    ).json()) as { transactions: { reason: string }[] }
    expect(unmatched.transactions.map((row) => row.reason).sort()).toEqual([
      "NO_VARIABLE_SYMBOL",
      "UNKNOWN_VARIABLE_SYMBOL",
      "UNSUPPORTED_CURRENCY",
    ])
  })

  it("hands back the uploaded CSV with the result of each row, in the request language (US-561)", async () => {
    const confirmedNumber = await createApplication(true)
    const id = String(Date.now())
    const rows: [number, string][] = [
      [7000, String(confirmedNumber * 1000 + firstTerm.number)],
      [200, ""],
      [-50, "1"],
      [100, String(confirmedNumber * 1000)],
    ]
    const csv = statement(id, rows)
    const send = async (language: string): Promise<string[]> => {
      const response = await fetch(api(`/organizer/events/${eventId}/bank-statements`), {
        method: "POST",
        headers: { "Content-Type": "text/csv", "Accept-Language": language, Cookie: cookie },
        body: csv,
      })
      return ((await response.json()) as { annotatedCsv: string }).annotatedCsv.split("\r\n")
    }
    const original = csv.split("\r\n")

    const first = await send("cs")
    // Every original row is untouched; only the result is added at the end of it.
    first.forEach((line, index) => expect(line.startsWith(original[index])).toBe(true))
    expect(first[0]).toBe(`${original[0]};Výsledek párování`)
    expect(first[1]).toBe(
      `${original[1]};Spárováno: přihláška č. ${confirmedNumber}, termín ${firstTerm.number}`,
    )
    expect(first[2]).toBe(`${original[2]};Nespárováno: chybí variabilní symbol`)
    expect(first[3]).toBe(`${original[3]};Přeskočeno: odchozí platba`)
    expect(first[4]).toBe(
      `${original[4]};Spárováno: přihláška č. ${confirmedNumber}, souhrnná platba`,
    )

    expect(first.join("\n")).not.toContain("Bank Test")

    // The same file again: the rows paid before are not counted twice, and the copy says so.
    const second = await send("en")
    expect(second[0]).toBe(`${original[0]};Matching result`)
    expect(second[1]).toBe(`${original[1]};Skipped: already imported earlier`)
    expect(second[2]).toBe(`${original[2]};Unmatched: no variable symbol`)
    expect(second[3]).toBe(`${original[3]};Skipped: outgoing transaction`)
  })

  it("sends exactly one e-mail through the queue for an imported payment of one term", async () => {
    const number = await createApplication(true, "Import e-mail")
    const { email } = await prisma.application.findFirstOrThrow({ where: { eventId, number } })
    const csv = statement(`mail${Date.now()}-`, [[6900, String(number * 1000 + firstTerm.number)]])
    expect(await (await upload(csv)).json()).toMatchObject({ matchedCount: 1 })
    await expectOnePaymentEmail(email)
    expect(await (await upload(csv)).json()).toMatchObject({ duplicateCount: 1 })
    await expectOnePaymentEmail(email)
  })

  it("imports parallel statements for one application without a deadlock", async () => {
    const number = await createApplication(true, "Parallel")
    const vs = String(number * 1000 + firstTerm.number)
    const responses = await Promise.all(
      [1, 2, 3, 4].map((n) => upload(statement(`par${Date.now()}-${n}-`, [[100 * n, vs]]))),
    )
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200])
    const application = await prisma.application.findFirstOrThrow({ where: { eventId, number } })
    const stored = await prisma.bankTransaction.findMany({
      where: { applicationId: application.id },
    })
    expect(stored).toHaveLength(4)
    expect(stored.every((row) => row.status === "MATCHED")).toBe(true)
    const payments = await prisma.payment.findMany({
      where: { applicationTerm: { applicationId: application.id } },
    })
    expect(payments.map((payment) => payment.amountCzk).sort()).toEqual([100, 200, 300, 400])
  })

  describe("summary variable symbol (US-148)", () => {
    type Status = "CONFIRMED" | "WAITLISTED" | "ARCHIVED"
    let participantId: string

    /** An application of the participant account with the first terms of the event in these states. */
    const createSummaryApplication = async (
      statuses: Status[],
    ): Promise<{ number: number; email: string; termNumbers: number[] }> => {
      const event = await prisma.event.findUniqueOrThrow({
        where: { id: eventId },
        include: { terms: { orderBy: { startsOn: "asc" } } },
      })
      const email = `summary-${randomUUID()}@example.com`
      const application = await prisma.application.create({
        data: {
          organizationId: event.organizationId,
          eventId,
          userId: participantId,
          accessToken: `summary-test-${randomUUID()}`,
          firstName: "Summary",
          lastName: "Test",
          birthDate: new Date("2000-01-01"),
          gender: "FEMALE",
          email,
          consentAt: new Date(),
          terms: {
            create: statuses.map((status, index) => ({
              organizationId: event.organizationId,
              termId: event.terms[index].id,
              status,
              priceCzk: 1000 * (index + 1),
            })),
          },
        },
      })
      return {
        number: application.number,
        email,
        termNumbers: event.terms.slice(0, statuses.length).map((term) => term.number),
      }
    }

    const rowsOf = async (number: number): Promise<{ term: number; amountCzk: number }[]> => {
      const rows = await prisma.payment.findMany({
        where: { applicationTerm: { application: { number } } },
        include: { applicationTerm: { include: { term: { select: { number: true } } } } },
        orderBy: { applicationTerm: { term: { startsOn: "asc" } } },
      })
      return rows.map((row) => ({
        term: row.applicationTerm.term.number,
        amountCzk: row.amountCzk,
      }))
    }

    beforeAll(async () => {
      participantId = (
        await prisma.user.findUniqueOrThrow({ where: { email: "ucastnik@example.com" } })
      ).id
    })

    it("splits a payment over the terms from the oldest, as one receipt, with one e-mail and a notification per term", async () => {
      const application = await createSummaryApplication(["CONFIRMED", "CONFIRMED"])
      const vs = String(application.number * 1000)
      // 1000 + 2000 owed; 3500 pays both and leaves 500 as an overpayment of the last term (D-087).
      const response = await upload(statement(String(Date.now()), [[3500, vs]]))
      expect(await response.json()).toMatchObject({
        matchedCount: 1,
        matchedCzk: 3500,
        overpaidCount: 1,
        overpaidCzk: 500,
        unmatchedCount: 0,
      })
      expect(await rowsOf(application.number)).toEqual([
        { term: application.termNumbers[0], amountCzk: 1000 },
        { term: application.termNumbers[1], amountCzk: 2500 },
      ])
      const rows = await prisma.payment.findMany({
        where: { applicationTerm: { application: { number: application.number } } },
      })
      expect(new Set(rows.map((row) => row.receiptId)).size).toBe(1)
      expect(rows.every((row) => row.source === "BANK_IMPORT" && row.isSummary)).toBe(true)
      // E-mail no. 8 once for the application, naming both terms that were closed.
      await latestEmailTo(application.email)
      expect(allEmailsTo(application.email)).toHaveLength(1)
      const notifications = await prisma.notification.findMany({
        where: {
          applicationId: (
            await prisma.application.findFirstOrThrow({
              where: { eventId, number: application.number },
            })
          ).id,
        },
      })
      expect(notifications).toHaveLength(2)
      expect(
        notifications.every((row) => row.type === "PAYMENT" && row.kind === "PAYMENT_RECORDED"),
      ).toBe(true)
    })

    it("keeps the shortfall on the latest term and counts the same upload once", async () => {
      const application = await createSummaryApplication(["CONFIRMED", "CONFIRMED"])
      const csv = statement(String(Date.now()), [[1500, String(application.number * 1000)]])
      expect(await (await upload(csv)).json()).toMatchObject({ matchedCount: 1, overpaidCount: 0 })
      expect(await rowsOf(application.number)).toEqual([
        { term: application.termNumbers[0], amountCzk: 1000 },
        { term: application.termNumbers[1], amountCzk: 500 },
      ])
      // #737: the e-mail of a bank import goes through the queue, so it arrives after the answer.
      await expectOnePaymentEmail(application.email)
      expect(await (await upload(csv)).json()).toMatchObject({ matchedCount: 0, duplicateCount: 1 })
      expect(await rowsOf(application.number)).toHaveLength(2)
      expect(allEmailsTo(application.email)).toHaveLength(1)
    })

    it("records the whole amount as an overpayment of a waitlisted application and sends no e-mail", async () => {
      const application = await createSummaryApplication(["WAITLISTED"])
      const result = await (
        await upload(statement(String(Date.now()), [[800, String(application.number * 1000)]]))
      ).json()
      expect(result).toMatchObject({ matchedCount: 1, overpaidCount: 1, overpaidCzk: 800 })
      expect(await rowsOf(application.number)).toEqual([
        { term: application.termNumbers[0], amountCzk: 800 },
      ])
      expect(await hasSentNothingTo(application.email)).toBe(true)
    })

    it("stores a payment as unmatched when no term of the application can take it", async () => {
      const application = await createSummaryApplication(["ARCHIVED"])
      const result = await (
        await upload(statement(String(Date.now()), [[800, String(application.number * 1000)]]))
      ).json()
      expect(result).toMatchObject({ matchedCount: 0, unmatchedCount: 1, unmatchedCzk: 800 })
      expect(await rowsOf(application.number)).toEqual([])
      const unmatched = (await (
        await fetch(api(`/organizer/events/${eventId}/bank-transactions/unmatched`), {
          headers: { Cookie: cookie },
        })
      ).json()) as { transactions: { variableSymbol: string; reason: string }[] }
      expect(
        unmatched.transactions.find(
          (row) => row.variableSymbol === String(application.number * 1000),
        ),
      ).toMatchObject({ reason: "UNKNOWN_VARIABLE_SYMBOL" })
    })
  })

  it("rejects a file that is not a statement and a missing or foreign session", async () => {
    const invalid = await upload("hello")
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toMatchObject({ code: "BANK_STATEMENT_INVALID" })
    expect((await upload("x", "")).status).toBe(401)
    const foreign = await signIn("organizator2@example.com", "password2")
    expect((await upload("x", foreign)).status).toBe(403)
  })

  describe("manual match of an unmatched transaction (US-562)", () => {
    let seq = 0
    /** Imports one row without a variable symbol, so it stays unmatched. */
    const importUnmatched = async (
      amount: string | number,
      currency = "CZK",
    ): Promise<{ id: string; externalId: string }> => {
      const externalId = `manual-${Date.now()}-${seq++}`
      const csv = [
        "ID operace;Datum;Objem;Měna;Protiúčet;Název protiúčtu;Kód banky;Název banky;KS;VS;SS;Poznámka;Zpráva pro příjemce;Typ",
        `${externalId};05.05.2026;${amount};${currency};1;Test Payer;800;CS;;;;;;Platba`,
      ].join("\r\n")
      expect((await upload(csv)).status).toBe(200)
      const row = await prisma.bankTransaction.findFirstOrThrow({ where: { externalId } })
      return { id: row.id, externalId }
    }
    /** Confirms the stored amount unless the test says which one was seen. */
    const match = async (
      transactionId: string,
      body: {
        applicationId: string
        termId: string
        amountCents?: number
        previousReceiptId?: string
      },
      auth = cookie,
    ): Promise<Response> => {
      const { amountCents } = await prisma.bankTransaction.findUniqueOrThrow({
        where: { id: transactionId },
      })
      return fetch(api(`/organizer/events/${eventId}/bank-transactions/${transactionId}/match`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: auth },
        body: JSON.stringify({ amountCents, ...body }),
      })
    }
    const applicationOf = async (number: number) =>
      prisma.application.findFirstOrThrow({ where: { eventId, number } })

    it("sends exactly one e-mail through the queue for a manual assignment", async () => {
      const application = await applicationOf(await createApplication(true, "Match e-mail"))
      const { id } = await importUnmatched(6900)
      const body = { applicationId: application.id, termId: firstTerm.id }
      expect((await match(id, body)).status).toBe(204)
      await expectOnePaymentEmail(application.email)
      expect((await match(id, body)).status).toBe(409)
      await expectOnePaymentEmail(application.email)
    })

    it("records a BANK_IMPORT payment for a manual assignment and marks the transaction", async () => {
      const number = await createApplication(true)
      const application = await applicationOf(number)
      const { id } = await importUnmatched(6900)

      const response = await match(id, { applicationId: application.id, termId: firstTerm.id })
      expect(response.status).toBe(204)

      const payments = await prisma.payment.findMany({
        where: { applicationTerm: { applicationId: application.id } },
      })
      expect(payments).toMatchObject([
        {
          amountCzk: 6900,
          source: "BANK_IMPORT",
          receiptId: expect.stringMatching(/^bank-manual:/),
        },
      ])
      expect(await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).toMatchObject({
        status: "MATCHED",
        reason: "NO_VARIABLE_SYMBOL",
        applicationId: application.id,
        receiptId: payments[0]?.receiptId,
      })

      // The second assignment is refused and adds nothing; the row is gone from the list.
      const again = await match(id, { applicationId: application.id, termId: firstTerm.id })
      expect(again.status).toBe(409)
      expect(await again.json()).toMatchObject({ code: "BANK_TRANSACTION_ALREADY_MATCHED" })
      expect(
        await prisma.payment.count({
          where: { applicationTerm: { applicationId: application.id } },
        }),
      ).toBe(1)
      const unmatched = (await (
        await fetch(api(`/organizer/events/${eventId}/bank-transactions/unmatched`), {
          headers: { Cookie: cookie },
        })
      ).json()) as { transactions: { id: string }[] }
      expect(unmatched.transactions.map((row) => row.id)).not.toContain(id)
    })

    const cancel = (applicationId: string, receiptId: string, auth = cookie) =>
      fetch(
        api(`/organizer/applications/${applicationId}/payments/${encodeURIComponent(receiptId)}`),
        {
          method: "DELETE",
          headers: { Cookie: auth },
        },
      )

    it("reopens, reassigns and can cancel the same bank transaction again without replaying a payment", async () => {
      const original = await applicationOf(await createApplication(true, "First match"))
      const replacement = await applicationOf(await createApplication(true, "Second match"))
      const { id, externalId } = await importUnmatched(500)
      const originalMatch = { applicationId: original.id, termId: firstTerm.id }
      expect((await match(id, originalMatch)).status).toBe(204)
      const assigned = await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })
      const originalReceiptId = assigned.receiptId!
      const foreign = await signIn("organizator2@example.com", "password2")
      expect((await cancel(original.id, originalReceiptId, foreign)).status).toBe(403)
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).status).toBe(
        "MATCHED",
      )

      expect((await cancel(original.id, originalReceiptId)).status).toBe(204)
      expect((await cancel(original.id, originalReceiptId)).status).toBe(403)
      const list = await fetch(api(`/organizer/events/${eventId}/bank-transactions/unmatched`), {
        headers: { Cookie: cookie },
      })
      expect(await list.json()).toMatchObject({
        transactions: expect.arrayContaining([
          expect.objectContaining({
            id,
            previousReceiptId: originalReceiptId,
            applicationId: null,
            reason: "NO_VARIABLE_SYMBOL",
          }),
        ]),
      })
      expect((await match(id, originalMatch)).status).toBe(409)
      const csv = statement(externalId, [
        [500, String(original.number * 1000 + firstTerm.number)],
      ]).replace(`${externalId}0;`, `${externalId};`)
      expect(await (await upload(csv)).json()).toMatchObject({
        matchedCount: 0,
        unmatchedCount: 0,
        duplicateCount: 1,
      })

      const replacementMatch = {
        applicationId: replacement.id,
        termId: firstTerm.id,
        previousReceiptId: originalReceiptId,
      }
      const concurrent = await Promise.all([
        match(id, replacementMatch),
        match(id, replacementMatch),
      ])
      expect(concurrent.map(({ status }) => status).sort()).toEqual([204, 409])
      const reassigned = await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })
      const replacementReceiptId = reassigned.receiptId!
      expect(reassigned).toMatchObject({ status: "MATCHED", applicationId: replacement.id })
      expect(replacementReceiptId).not.toBe(originalReceiptId)
      expect(
        await prisma.payment.count({
          where: { receiptId: originalReceiptId, cancelledAt: { not: null } },
        }),
      ).toBe(1)
      expect(
        await prisma.payment.count({
          where: { receiptId: replacementReceiptId, cancelledAt: null },
        }),
      ).toBe(1)

      expect((await cancel(original.id, originalReceiptId)).status).toBe(403)
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).receiptId).toBe(
        replacementReceiptId,
      )
      expect((await cancel(replacement.id, replacementReceiptId)).status).toBe(204)
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).status).toBe(
        "UNMATCHED",
      )
      expect((await match(id, replacementMatch)).status).toBe(409)
      expect(
        (await match(id, { ...replacementMatch, previousReceiptId: replacementReceiptId })).status,
      ).toBe(204)
    })

    it("reopens an assignment when its corrected payment is cancelled", async () => {
      const application = await applicationOf(await createApplication(true, "Corrected match"))
      const { id } = await importUnmatched(500)
      expect(
        (await match(id, { applicationId: application.id, termId: firstTerm.id })).status,
      ).toBe(204)
      const assigned = await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })
      const originalReceiptId = assigned.receiptId!
      const requestId = randomUUID()
      const response = await fetch(
        api(
          `/organizer/applications/${application.id}/payments/${encodeURIComponent(originalReceiptId)}`,
        ),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify({ requestId, amountCzk: 500, termId: firstTerm.id }),
        },
      )
      expect(response.status).toBe(204)
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).status).toBe(
        "MATCHED",
      )
      expect((await cancel(application.id, originalReceiptId)).status).toBe(403)
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).status).toBe(
        "MATCHED",
      )
      expect((await cancel(application.id, requestId)).status).toBe(204)
      expect(await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).toMatchObject({
        status: "UNMATCHED",
        receiptId: originalReceiptId,
      })
    })

    it.each([
      [null, "NO_VARIABLE_SYMBOL"],
      ["xyz", "UNKNOWN_VARIABLE_SYMBOL"],
    ])(
      "reopens an older manual match when the reference %s proves its origin",
      async (vs, reason) => {
        const application = await applicationOf(
          await createApplication(true, "Legacy manual match"),
        )
        const { id, externalId } = await importUnmatched(500)
        const body = { applicationId: application.id, termId: firstTerm.id }
        expect((await match(id, body)).status).toBe(204)
        const assigned = await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })
        const legacyReceiptId = `bank:${application.organizationId}:${externalId}`
        await prisma.payment.updateMany({
          where: { receiptId: assigned.receiptId! },
          data: { receiptId: legacyReceiptId },
        })
        await prisma.bankTransaction.update({
          where: { id },
          data: { receiptId: legacyReceiptId, reason: null, variableSymbol: vs },
        })
        expect((await cancel(application.id, legacyReceiptId)).status).toBe(204)
        expect(await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).toMatchObject({
          status: "UNMATCHED",
          reason,
        })
        expect((await match(id, { ...body, previousReceiptId: legacyReceiptId })).status).toBe(204)
      },
    )

    it("keeps a legacy automatic match out of the unmatched list when its payment is cancelled", async () => {
      const application = await applicationOf(await createApplication(true, "Automatic match"))
      const prefix = `legacy-${Date.now()}-`
      const csv = statement(prefix, [[500, String(application.number * 1000 + firstTerm.number)]])
      expect(await (await upload(csv)).json()).toMatchObject({ matchedCount: 1 })
      const automatic = await prisma.bankTransaction.findFirstOrThrow({
        where: { eventId, externalId: `${prefix}0` },
      })
      expect((await cancel(application.id, automatic.receiptId!)).status).toBe(204)
      const persisted = await prisma.bankTransaction.findUniqueOrThrow({
        where: { id: automatic.id },
      })
      expect(persisted).toMatchObject({ status: "MATCHED", receiptId: automatic.receiptId })
      expect(await (await upload(csv)).json()).toMatchObject({
        matchedCount: 0,
        duplicateCount: 1,
      })
    })

    it("counts the row as a duplicate when the statement is uploaded again", async () => {
      const number = await createApplication(true)
      const application = await applicationOf(number)
      const { id, externalId } = await importUnmatched(500)
      await match(id, { applicationId: application.id, termId: firstTerm.id })
      const csv = [
        "ID operace;Datum;Objem;Měna;Protiúčet;Název protiúčtu;Kód banky;Název banky;KS;VS;SS;Poznámka;Zpráva pro příjemce;Typ",
        `${externalId};05.05.2026;500;CZK;1;Test Payer;800;CS;;;;;;Platba`,
      ].join("\r\n")
      expect(await (await upload(csv)).json()).toMatchObject({
        matchedCount: 0,
        unmatchedCount: 0,
        duplicateCount: 1,
      })
      expect(
        await prisma.payment.count({
          where: { applicationTerm: { applicationId: application.id } },
        }),
      ).toBe(1)
    })

    it("writes an amount above the debt as an overpayment", async () => {
      const application = await applicationOf(await createApplication(true))
      const { id } = await importUnmatched(8000)
      expect(
        (await match(id, { applicationId: application.id, termId: firstTerm.id })).status,
      ).toBe(204)
      const payment = await prisma.payment.findFirstOrThrow({
        where: { applicationTerm: { applicationId: application.id } },
      })
      expect(payment.amountCzk).toBe(8000)
    })

    it("refuses cents and another currency", async () => {
      const application = await applicationOf(await createApplication(true))
      for (const [amount, currency] of [
        ["1000,50", "CZK"],
        ["1000", "EUR"],
      ] as const) {
        const { id } = await importUnmatched(amount, currency)
        const response = await match(id, { applicationId: application.id, termId: firstTerm.id })
        expect(response.status).toBe(409)
        expect(await response.json()).toMatchObject({ code: "BANK_TRANSACTION_NOT_ASSIGNABLE" })
        expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).status).toBe(
          "UNMATCHED",
        )
      }
    })

    it("reads the amount under the lock: a re-import that turned it into cents meanwhile is refused", async () => {
      const application = await applicationOf(await createApplication(true, "Locked"))
      const { id } = await importUnmatched(500)
      let request: Promise<Response> | undefined
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM bank_transaction WHERE id = ${id} FOR UPDATE`
        request = match(id, { applicationId: application.id, termId: firstTerm.id })
        // The request has read the row (whole crowns) and waits for the lock.
        await new Promise((resolve) => setTimeout(resolve, 500))
        await tx.bankTransaction.update({ where: { id }, data: { amountCents: 50050 } })
      })
      const response = await request!
      expect(response.status).toBe(409)
      expect(await response.json()).toMatchObject({ code: "BANK_TRANSACTION_NOT_ASSIGNABLE" })
      expect(
        await prisma.payment.count({
          where: { applicationTerm: { applicationId: application.id } },
        }),
      ).toBe(0)
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).status).toBe(
        "UNMATCHED",
      )
    })

    it("refuses an amount that a re-import changed after the preview", async () => {
      const application = await applicationOf(await createApplication(true, "Stale preview"))
      const { id } = await importUnmatched(900)
      const body = { applicationId: application.id, termId: firstTerm.id }
      const response = await match(id, { ...body, amountCents: 50000 })
      expect(response.status).toBe(409)
      expect(await response.json()).toMatchObject({ code: "BANK_TRANSACTION_CHANGED" })
      expect(
        await prisma.payment.count({
          where: { applicationTerm: { applicationId: application.id } },
        }),
      ).toBe(0)
      expect((await match(id, body)).status).toBe(204)
    })

    it("checks e-mail no. 8 against the term it names, also when the payment overpays it", async () => {
      const application = await applicationOf(await createApplication(true, "Overpaid e-mail"))
      const applicationTerm = await prisma.applicationTerm.findFirstOrThrow({
        where: { applicationId: application.id },
      })
      const organizer = await prisma.user.findUniqueOrThrow({
        where: { email: "organizator@example.com" },
      })
      const payments = new PaymentsRepository(
        prisma,
        new NotificationsRepository(prisma),
        new PrismaEmailJobRepository(prisma),
      )
      const pay = (amountCzk: number, source: "MANUAL" | "BANK_IMPORT") => {
        const requestId = randomUUID()
        return payments
          .record({
            applicationId: application.id,
            organizationId: application.organizationId,
            recordedById: organizer.id,
            requestId,
            termId: firstTerm.id,
            amountCzk,
            source,
          })
          .then(() => requestId)
      }
      const first = await pay(1000, "MANUAL")
      // Written past the server, so nothing starts the queue and the job keeps its payload.
      await pay(6500, "BANK_IMPORT")
      const job = await prisma.emailJob.findFirstOrThrow({
        where: { recipient: application.email },
      })
      const email = { ...(job.payload as object), template: job.template } as QueuedEmail
      expect(email).toMatchObject({ basis: { settledTermIds: [applicationTerm.id] } })
      const queued = new QueuedEmailRepository(prisma)
      expect(await queued.isOutdated(email)).toBe(false)
      await prisma.payment.updateMany({
        where: { receiptId: first },
        data: { cancelledAt: new Date() },
      })
      expect(await queued.isOutdated(email)).toBe(true)
      await prisma.emailJob.delete({ where: { id: job.id } })
    })

    it("refuses a term outside the application, an unknown application and a foreign session", async () => {
      const application = await applicationOf(await createApplication(true))
      const otherTerm = await prisma.term.findFirstOrThrow({
        where: { eventId, id: { not: firstTerm.id } },
      })
      const { id } = await importUnmatched(300)
      const outside = await match(id, { applicationId: application.id, termId: otherTerm.id })
      expect(outside.status).toBe(400)
      expect(await outside.json()).toMatchObject({ code: "PAYMENT_TERM_NOT_IN_APPLICATION" })
      expect((await match(id, { applicationId: "nope", termId: firstTerm.id })).status).toBe(403)
      const foreignTerm = await prisma.term.findFirstOrThrow({
        where: { organizationId: { not: application.organizationId } },
      })
      for (const termId of [foreignTerm.id, "nope"])
        expect((await match(id, { applicationId: application.id, termId })).status).toBe(403)
      const foreign = await signIn("organizator2@example.com", "password2")
      expect(
        (await match(id, { applicationId: application.id, termId: firstTerm.id }, foreign)).status,
      ).toBe(403)
      expect(
        (await match(id, { applicationId: application.id, termId: firstTerm.id }, "")).status,
      ).toBe(401)
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).status).toBe(
        "UNMATCHED",
      )
    })

    it("rejects a request without a term or with unknown fields before anything is written", async () => {
      const application = await applicationOf(await createApplication(true))
      const { id } = await importUnmatched(300)
      for (const body of [
        { applicationId: application.id },
        { applicationId: application.id, termId: firstTerm.id, amountCzk: 1 },
      ]) {
        const response = await match(id, body as { applicationId: string; termId: string })
        expect(response.status).toBe(400)
      }
      expect((await prisma.bankTransaction.findUniqueOrThrow({ where: { id } })).status).toBe(
        "UNMATCHED",
      )
      expect(
        await prisma.payment.count({
          where: { applicationTerm: { applicationId: application.id } },
        }),
      ).toBe(0)
    })

    it("refuses a repeated or unknown query parameter of the search as VALIDATION_FAILED", async () => {
      const { id } = await importUnmatched(300)
      for (const query of [
        "q=bank&q=test",
        `q=bank&transactionId=${id}&transactionId=${id}`,
        "q=bank&limit=100",
      ]) {
        const response = await fetch(
          api(`/organizer/events/${eventId}/bank-transactions/application-candidates?${query}`),
          { headers: { Cookie: cookie } },
        )
        expect(response.status).toBe(400)
        expect(await response.json()).toMatchObject({ code: "VALIDATION_FAILED" })
      }
    })

    it("searches applications by name, variable symbol and number, with what each term owes", async () => {
      const number = await createApplication(true)
      const search = async (q: string) =>
        (await (
          await fetch(
            api(
              `/organizer/events/${eventId}/bank-transactions/application-candidates?q=${encodeURIComponent(q)}`,
            ),
            { headers: { Cookie: cookie } },
          )
        ).json()) as {
          candidates: {
            number: number
            terms: { termId: string; owedCzk: number; paidCzk: number }[]
          }[]
        }
      for (const q of ["bank test", String(number * 1000 + firstTerm.number), String(number)]) {
        const found = (await search(q)).candidates.find((candidate) => candidate.number === number)
        expect(found?.terms[0]).toMatchObject({
          termId: firstTerm.id,
          owedCzk: 6900,
          paidCzk: 0,
        })
      }
      expect((await search("")).candidates).toEqual([])
      expect((await search("bank")).candidates.length).toBeLessThanOrEqual(10)
      const foreign = await signIn("organizator2@example.com", "password2")
      const denied = await fetch(
        api(`/organizer/events/${eventId}/bank-transactions/application-candidates?q=bank`),
        { headers: { Cookie: foreign } },
      )
      expect(denied.status).toBe(403)
    })
  })
})
