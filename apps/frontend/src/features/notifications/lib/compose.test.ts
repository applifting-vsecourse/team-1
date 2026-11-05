import { describe, expect, it } from "vitest"

import { i18n } from "@/i18n"

import {
  NOTIFICATION_KINDS,
  type AppNotification,
} from "@/features/notifications/api/notifications"
import { composeNotification } from "@/features/notifications/lib/compose"

const base = (kind: AppNotification["kind"]): AppNotification => ({
  id: "n1",
  type: kind.startsWith("PAYMENT")
    ? "PAYMENT"
    : kind.startsWith("REQUEST")
      ? "REQUEST"
      : "STATUS_CHANGED",
  kind,
  applicationId: "a1",
  params: {
    eventName: "Letní kemp Lipno 2027",
    participantName: "Adam Dvořák",
    termStartsOn: "2027-07-12",
    termEndsOn: "2027-07-18",
    amountCzk: 500,
    owedCzk: 4400,
  },
  createdAt: "2027-03-11T09:32:00.000Z",
  readAt: null,
})

const compose = (kind: AppNotification["kind"], language: "en" | "cs") =>
  composeNotification(base(kind), i18n.getFixedT(language, "notifications"), language)

describe("composeNotification", () => {
  it("composes the Czech copy drawn in Figma", () => {
    expect(compose("CONFIRMED", "cs")).toMatchObject({
      title: "Účast je potvrzená",
      detail: "Adam Dvořák · 12.–18. 7. 2027 · Letní kemp Lipno 2027",
    })
    expect(compose("PAYMENT_RECORDED", "cs")).toMatchObject({
      title: expect.stringMatching(/^Přijatá platba 500\s+Kč$/) as string,
      detail: expect.stringMatching(
        /^Adam Dvořák · dluh v termínu 12\.–18\. 7\. se snížil na 4\s400\s+Kč$/,
      ) as string,
    })
    expect(compose("REQUEST_APPROVED", "cs")).toMatchObject({
      title: "Žádost o změnu byla schválená",
      detail: "Adam Dvořák · nový termín 12.–18. 7. 2027",
    })
  })

  it("formats the time of the notification", () => {
    expect(compose("CONFIRMED", "cs").time).toMatch(/^\d{1,2}\. \d{1,2}\. 2027 · \d{2}:\d{2}$/)
  })

  it.each(NOTIFICATION_KINDS)("has a title and a detail for %s in both languages", (kind) => {
    for (const language of ["en", "cs"] as const) {
      const { title, detail } = compose(kind, language)
      expect(title).not.toMatch(/^title\.|\{\{/)
      expect(detail).not.toMatch(/^detail\.|\{\{/)
      expect(title.length).toBeGreaterThan(0)
      expect(detail).toContain("Adam Dvořák")
    }
  })

  it("follows the language", () => {
    expect(compose("WAITLISTED", "en").title).toBe("You are on the waitlist")
    expect(compose("WAITLISTED", "cs").title).toBe("Jste náhradník")
  })
})
