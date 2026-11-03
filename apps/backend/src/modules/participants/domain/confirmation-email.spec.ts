import type { ApplicationChangeProps } from "@/core/email/templates/application-change"
import { buildChangeProps, buildConfirmationApplications } from "./confirmation-email"
import { ApplicationChange, SubmittedApplication } from "./submission-confirmation"

const application: SubmittedApplication = {
  number: 49,
  firstName: "Petr",
  lastName: "Novák",
  accessToken: "token-49",
  terms: [
    { name: "1. týden", termNumber: 1, status: "CONFIRMED", priceCzk: 4500 },
    { name: "2. týden", termNumber: 2, status: "WAITLISTED", priceCzk: 4900 },
    { name: "3. týden", termNumber: 3, status: "CANCELLED", priceCzk: 4900 },
  ],
}

describe("buildConfirmationApplications", () => {
  it("lists terms to evaluate without payment details (US-102)", () => {
    const [built] = buildConfirmationApplications(
      {
        email: "a@example.com",
        locale: "cs",
        eventName: "Kemp",
        bankAccount: "2900123456/2010",
        mustSetPassword: false,
        applications: [
          {
            ...application,
            terms: [
              { name: "1. týden", termNumber: 1, status: "TO_EVALUATE", priceCzk: 4500 },
              { name: "2. týden", termNumber: 2, status: "TO_EVALUATE", priceCzk: 4900 },
            ],
          },
        ],
      },
      "https://app",
    )

    expect(built.terms).toEqual([
      { name: "1. týden", status: "TO_EVALUATE" },
      { name: "2. týden", status: "TO_EVALUATE" },
    ])
    expect(built.payment).toBeNull()
  })

  it("leaves a cancelled term out of the submission summary", () => {
    const [built] = buildConfirmationApplications(
      {
        email: "a@example.com",
        locale: "cs",
        eventName: "Kemp",
        bankAccount: "2900123456/2010",
        mustSetPassword: false,
        applications: [application],
      },
      "https://app",
    )

    expect(built.terms).toEqual([
      { name: "1. týden", status: "CONFIRMED" },
      { name: "2. týden", status: "WAITLISTED" },
    ])
  })
})

describe("buildChangeProps", () => {
  const change = (
    overrides: Partial<ApplicationChange & { kind: ApplicationChangeProps["kind"] }> = {},
  ): ApplicationChange & { kind: ApplicationChangeProps["kind"] } => ({
    email: "a@example.com",
    locale: "cs",
    eventName: "Kemp",
    organizationName: "Alpine Collective",
    bankAccount: "2900123456/2010",
    kind: "REJECTED",
    termName: "1. týden",
    gender: "MALE",
    application,
    isAmountChanged: false,
    ...overrides,
  })

  it("names the participant, the changed term, the organization and the link into the app", () => {
    expect(buildChangeProps(change(), "https://app")).toMatchObject({
      name: "Petr Novák",
      gender: "MALE",
      term: "1. týden",
      organizationName: "Alpine Collective",
      confirmationUrl: "https://app/apply/confirmation/token-49",
    })
  })

  it("adds payment details only when the amount changed because the application became confirmed", () => {
    expect(buildChangeProps(change(), "https://app").payment).toBeNull()
    expect(
      buildChangeProps(change({ isAmountChanged: true, kind: "CONFIRMED" }), "https://app").payment,
    ).toMatchObject({ bankAccount: "2900123456/2010", variableSymbol: "49000" })
    expect(
      buildChangeProps(
        change({ isAmountChanged: true, kind: "CONFIRMED_FROM_WAITLIST" }),
        "https://app",
      ).payment,
    ).not.toBeNull()
    for (const kind of ["WAITLISTED", "REJECTED", "CANCELLED", "CANCELLED_BY_ORGANIZER"] as const) {
      expect(
        buildChangeProps(change({ isAmountChanged: true, kind }), "https://app").payment,
      ).toBeNull()
    }
  })
})

describe("payment details of the e-mails (US-137)", () => {
  it("gives the summary symbol and one per confirmed term when several are confirmed", () => {
    const [built] = buildConfirmationApplications(
      {
        email: "a@example.com",
        locale: "cs",
        eventName: "Kemp",
        bankAccount: "2900123456/2010",
        mustSetPassword: false,
        applications: [
          {
            ...application,
            number: 48,
            terms: [
              { name: "1. týden", termNumber: 1, status: "CONFIRMED", priceCzk: 4500 },
              { name: "2. týden", termNumber: 2, status: "CONFIRMED", priceCzk: 4900 },
              { name: "3. týden", termNumber: 3, status: "WAITLISTED", priceCzk: 4900 },
            ],
          },
        ],
      },
      "https://app",
    )

    expect(built.payment).toMatchObject({ variableSymbol: "48000", bankAccount: "2900123456/2010" })
    expect(built.payment?.terms.map((t) => [t.name, t.variableSymbol])).toEqual([
      ["1. týden", "48001"],
      ["2. týden", "48002"],
    ])
  })

  it("keeps only the summary symbol with a single confirmed term", () => {
    const [built] = buildConfirmationApplications(
      {
        email: "a@example.com",
        locale: "cs",
        eventName: "Kemp",
        bankAccount: "2900123456/2010",
        mustSetPassword: false,
        applications: [application],
      },
      "https://app",
    )

    expect(built.payment).toMatchObject({ variableSymbol: "49000", terms: [] })
  })

  it("repeats the symbols in the change e-mail that confirms a term", () => {
    const props = buildChangeProps(
      {
        email: "a@example.com",
        locale: "cs",
        eventName: "Kemp",
        bankAccount: "2900123456/2010",
        kind: "CONFIRMED",
        organizationName: "Alpine Collective",
        termName: "1. týden",
        gender: "MALE",
        application: { ...application, number: 12345 },
        isAmountChanged: true,
      },
      "https://app",
    )

    expect(props.payment).toMatchObject({ variableSymbol: "12345000", terms: [] })
  })
})
