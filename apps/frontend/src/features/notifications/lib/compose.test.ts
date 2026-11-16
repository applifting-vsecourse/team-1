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
    fromStatus: "WAITLISTED",
    toStatus: "CONFIRMED",
  },
  createdAt: "2027-03-11T09:32:00.000Z",
  readAt: null,
})

const compose = (kind: AppNotification["kind"], language: "en" | "cs") =>
  composeNotification(base(kind), i18n.getFixedT(language, "notifications"), language)

describe("composeNotification", () => {
  it("separates who, where and what changed", () => {
    expect(compose("CONFIRMED", "cs")).toMatchObject({
      title: "Přihláška byla potvrzena",
      participant: "Adam Dvořák",
      context: "12.–18. 7. 2027 · Letní kemp Lipno 2027",
      change: { from: "Náhradník", to: "Potvrzeno" },
    })
  })

  it("tells a substitute who got a place from one who was confirmed straight away", () => {
    const fromWaitlist = compose("CONFIRMED_FROM_WAITLIST", "cs")
    const confirmed = compose("CONFIRMED", "cs")

    expect(fromWaitlist.title).toBe("Uvolnilo se místo, účast je potvrzená")
    expect(fromWaitlist.title).not.toBe(confirmed.title)
    expect(compose("WAITLISTED", "cs").title).toBe("Jste náhradník")
  })

  it("names the status before and after in English too", () => {
    expect(compose("WAITLISTED", "en")).toMatchObject({
      title: "You are a substitute",
      change: { from: "Waitlisted", to: "Confirmed" },
    })
  })

  it("shows a payment with the amount and what is still owed", () => {
    const text = compose("PAYMENT_RECORDED", "cs")

    expect(text.title).toMatch(/^Přijatá platba 500\s+Kč$/)
    expect(text.note).toMatch(/^Zbývá zaplatit: 4\s400\s+Kč$/)
  })

  it("formats the time of the notification", () => {
    expect(compose("CONFIRMED", "cs").time).toMatch(/^\d{1,2}\. \d{1,2}\. 2027 · \d{2}:\d{2}$/)
  })

  it("shows an application edit without inventing a term", () => {
    const notice = base("APPLICATION_EDITED")
    delete notice.params.termStartsOn
    delete notice.params.termEndsOn
    expect(composeNotification(notice, i18n.getFixedT("cs", "notifications"), "cs")).toMatchObject({
      title: "Přihlašovatel upravil přihlášku",
      context: "Letní kemp Lipno 2027",
    })
  })

  it.each(NOTIFICATION_KINDS)("has a title and a context for %s in both languages", (kind) => {
    for (const language of ["en", "cs"] as const) {
      const { title, participant, context } = compose(kind, language)
      expect(title).not.toMatch(/^title\.|\{\{/)
      expect(title.length).toBeGreaterThan(0)
      expect(participant).toBe("Adam Dvořák")
      expect(context).toContain("Letní kemp Lipno 2027")
    }
  })
})
