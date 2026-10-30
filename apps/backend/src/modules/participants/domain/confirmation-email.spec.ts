import { buildChangeProps, buildConfirmationApplications } from "./confirmation-email"
import { ApplicationChange, SubmittedApplication } from "./submission-confirmation"

const application: SubmittedApplication = {
  number: 49,
  firstName: "Petr",
  lastName: "Novák",
  accessToken: "token-49",
  terms: [
    { name: "1. týden", status: "CONFIRMED", priceCzk: 4500 },
    { name: "2. týden", status: "WAITLISTED", priceCzk: 4900 },
    { name: "3. týden", status: "CANCELLED", priceCzk: 4900 },
  ],
}

describe("buildConfirmationApplications", () => {
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
  const change = (overrides: Partial<ApplicationChange> = {}): ApplicationChange => ({
    email: "a@example.com",
    locale: "cs",
    eventName: "Kemp",
    bankAccount: "2900123456/2010",
    kind: "REJECTED",
    application,
    isAmountChanged: false,
    ...overrides,
  })

  it("lists every term of the change e-mail, a cancelled one too", () => {
    expect(buildChangeProps(change(), "https://app").terms).toEqual([
      { name: "1. týden", status: "CONFIRMED" },
      { name: "2. týden", status: "WAITLISTED" },
      { name: "3. týden", status: "CANCELLED" },
    ])
  })

  it("adds payment details only when the amount changed and the application is not cancelled", () => {
    expect(buildChangeProps(change(), "https://app").payment).toBeNull()
    expect(
      buildChangeProps(change({ isAmountChanged: true, kind: "STATUS_CHANGED" }), "https://app")
        .payment,
    ).toMatchObject({ bankAccount: "2900123456/2010", variableSymbol: "0049" })
    expect(
      buildChangeProps(change({ isAmountChanged: true, kind: "CANCELLED" }), "https://app").payment,
    ).toBeNull()
  })
})
