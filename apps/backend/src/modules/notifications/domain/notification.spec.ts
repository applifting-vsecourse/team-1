import { buildNotification, isoDay, typeOfKind } from "./notification"

const params = {
  eventName: "Letní kemp",
  participantName: "Adam Dvořák",
  termStartsOn: "2027-07-12",
  termEndsOn: "2027-07-18",
}

describe("notification", () => {
  it.each([
    ["CONFIRMED", "STATUS_CHANGED"],
    ["NO_BED_FREED", "STATUS_CHANGED"],
    ["CANCELLED", "STATUS_CHANGED"],
    ["PAYMENT_RECORDED", "PAYMENT"],
    ["PAYMENT_CANCELLED", "PAYMENT"],
    ["PAYMENT_REFUNDED", "PAYMENT"],
    ["REQUEST_APPROVED", "REQUEST"],
  ] as const)("%s is of the type %s", (kind, type) => {
    expect(typeOfKind(kind)).toBe(type)
  })

  it("is made for the account of the application", () => {
    expect(
      buildNotification({ userId: "u1", applicationId: "a1", kind: "CONFIRMED", params }),
    ).toEqual({
      userId: "u1",
      type: "STATUS_CHANGED",
      kind: "CONFIRMED",
      applicationId: "a1",
      params,
    })
  })

  it("is not made for an application without an account", () => {
    expect(
      buildNotification({ userId: null, applicationId: "a1", kind: "CONFIRMED", params }),
    ).toBeNull()
  })

  it("writes a date column as an ISO day", () => {
    expect(isoDay(new Date("2027-07-12T00:00:00.000Z"))).toBe("2027-07-12")
  })
})
