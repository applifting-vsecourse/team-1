import { applicantEmail } from "@/shared/rate-limit/applicant-email"

describe("applicantEmail", () => {
  it("counts one mailbox however it is typed", () => {
    expect(applicantEmail({ email: "  Jana.Nova@Example.COM " })).toBe("jana.nova@example.com")
  })

  it.each([undefined, null, "text", {}, { email: 5 }, { email: ["a@b.cz"] }, { email: "   " }])(
    "has nothing to count in %j",
    (body) => {
      expect(applicantEmail(body)).toBeNull()
    },
  )
})
