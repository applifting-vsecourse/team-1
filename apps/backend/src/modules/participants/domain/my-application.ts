import { ApplicationTermStatus } from "@/modules/applications/domain/evaluation"
import {
  buildPaymentDetails,
  computeApplicationDue,
  computeApplicationPaid,
  PaymentDetails as TermPaymentDetails,
} from "@/modules/applications/domain/payment-details"
import {
  computeAmountOwed,
  computePaymentStatus,
  computeRefundableAmount,
  computeTermDue,
  computeTermPaid,
  PaymentStatus,
} from "@/modules/applications/domain/pricing"
import { variableSymbol as toVariableSymbol } from "@/modules/applications/domain/variable-symbol"

/** One application of the signed-in participant as stored — what the overview is built from (US-54). */
export type MyApplicationRecord = {
  id: string
  /** Global sequence, the variable symbol. */
  number: number
  submittedAt: Date
  firstName: string
  lastName: string
  eventName: string
  /** Account number of the organization that runs the event. */
  bankAccount: string
  /** Event's payment period in days (D-099). */
  paymentPeriodDays: number
  organizationName: string
  /** Public contact of the event (US-122); optional unless the event is in the catalog. */
  contactEmail: string | null
  contactPhone: string | null
  /** The participant has entered a meal restriction: an option, an allergy or a request (US-64). */
  mealsFilled: boolean
  /** The participant has saved a health restriction (US-68); a row exists only with consent. */
  healthFilled: boolean
  /** The applicant settles the accommodation individually (US-38); no room is shown to them. */
  individualAccommodation: boolean
  terms: {
    termId: string
    /** `Term.number`, part of the term's variable symbol. */
    termNumber: number
    name: string | null
    startsOn: Date
    endsOn: Date
    status: ApplicationTermStatus
    /** Price frozen at evaluation. */
    priceCzk: number
    /** Non-cancelled payment rows of this application in this term. */
    payments: {
      amountCzk: number
      source: "MANUAL" | "SIMULATION" | "BANK_IMPORT"
      createdAt: Date
    }[]
    /** Latest confirmation; the payment deadline counts from it. */
    confirmedAt: Date | null
    /** Restart of the payment period after a correction (US-112). */
    paymentPeriodStartedAt: Date | null
    /** The organizer set up at least one transport to this term (US-65). */
    transportOffered: boolean
    /** The participant chose a transport or their own transport for this term. */
    transportDecided: boolean
    /** The organizer published the room assignment of this term (US-144). */
    roomsPublished: boolean
    /** Name of the assigned room, `null` while not assigned. */
    roomName: string | null
    /** The term is cancelled by the organizer; nothing is arranged for it. */
    termCancelled: boolean
    /** Names the participant wishes to room with (US-146). */
    roomWishes: string[]
    /** Later arrival / earlier departure, Prague wall time `yyyy-MM-ddTHH:mm` (US-143). */
    lateArrival: string | null
    earlyDeparture: string | null
  }[]
}

export type MyApplicationTerm = {
  termId: string
  name: string | null
  /** ISO dates, e.g. "2027-07-04". */
  startsOn: string
  endsOn: string
  status: ApplicationTermStatus
  priceCzk: number
  archivedOverpaymentCzk?: number
  /** Transport is offered in this term (US-65). */
  transportOffered: boolean
  /** The participant has told how they get there. */
  transportDecided: boolean
  /**
   * Present only for a confirmed term whose room assignment is published, and never for a
   * participant with individual accommodation. `name` is `null` while no room is assigned (US-144).
   */
  room?: { name: string | null }
  /**
   * Present only for a confirmed term that is not cancelled, and never for a participant with
   * individual accommodation — the only case they can write wishes (US-146); empty = none yet.
   */
  roomWishes?: string[]
  /**
   * Present while the application in the term is not cancelled or archived — the only case the
   * participant can set them (US-143). Both `null` when nothing is given.
   */
  stay?: { lateArrival: string | null; earlyDeparture: string | null }
}

/** Where and how much to pay — only when at least one term is confirmed (US-25). */
export type PaymentDetails = TermPaymentDetails

/** Who the participant can call or write to about the event; the phone is shown as the organizer typed it. */
export type OrganizationContact = {
  name: string
  email: string | null
  phone: string | null
}

/** A payment the participant simulated on staging or demo (US-115). */
export type SimulatedPayment = {
  termId: string
  amountCzk: number
  /** ISO datetime. */
  createdAt: string
}

export type MyApplication = {
  id: string
  eventName: string
  firstName: string
  lastName: string
  /** Reference for people: initials of the event and the number, "LKL-0048". */
  code: string
  /** The summary variable symbol: application number × 1000, 48 → "48000". */
  variableSymbol: string
  terms: MyApplicationTerm[]
  /** Meal restrictions entered (application-wide, so the same in every term). */
  mealsDecided: boolean
  /** Health restriction entered (application-wide). */
  healthDecided: boolean
  amountDueCzk: number
  amountPaidCzk: number
  /** Due − paid; negative is an overpayment and is shown as such. */
  amountOwedCzk: number
  paymentStatus: PaymentStatus
  paymentDetails: PaymentDetails | null
  /** The simulation button is offered only where the backend allows it (never in production). */
  canSimulatePayment: boolean
  /** Newest first. */
  simulatedPayments: SimulatedPayment[]
  organizationContact: OrganizationContact
}

/**
 * The application's reference for people — initials of the event and the
 * number, `LKL-0048`. Display only: a bank accepts digits alone as a variable
 * symbol, so the payment uses `variableSymbol`.
 */
export function toApplicationCode(eventName: string, number: number): string {
  const initials = eventName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length > 0)
    .map((word) => word[0].toUpperCase())
    .join("")
  return `${initials || "P"}-${String(number).padStart(4, "0")}`
}

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

/**
 * Builds the overview of one application. Amounts come from the pricing
 * functions of the applications domain — nothing is recomputed here. The
 * participant sees a waitlisted term only as waitlisted, never
 * their place in line.
 */
export function buildMyApplication(
  record: MyApplicationRecord,
  canSimulatePayment = false,
): MyApplication {
  const amountDueCzk = computeApplicationDue(record.terms)
  const amountPaidCzk = computeApplicationPaid(record.terms)
  const variableSymbol = toVariableSymbol(record.number)
  const details = buildPaymentDetails(
    record.number,
    record.bankAccount,
    record.terms,
    record.paymentPeriodDays,
  )

  return {
    id: record.id,
    eventName: record.eventName,
    firstName: record.firstName,
    lastName: record.lastName,
    code: toApplicationCode(record.eventName, record.number),
    variableSymbol,
    terms: [...record.terms]
      .sort((a, b) => a.startsOn.getTime() - b.startsOn.getTime())
      .map((term) => ({
        termId: term.termId,
        name: term.name,
        startsOn: toIsoDate(term.startsOn),
        endsOn: toIsoDate(term.endsOn),
        status: term.status,
        priceCzk: term.priceCzk,
        ...(term.status === "ARCHIVED"
          ? {
              archivedOverpaymentCzk: computeRefundableAmount(
                computeTermDue(term),
                computeTermPaid(term.payments),
              ),
            }
          : {}),
        transportOffered: term.transportOffered,
        transportDecided: term.transportDecided,
        ...(term.status === "CONFIRMED" && term.roomsPublished && !record.individualAccommodation
          ? { room: { name: term.roomName } }
          : {}),
        ...(term.status === "CONFIRMED" && !term.termCancelled && !record.individualAccommodation
          ? { roomWishes: term.roomWishes }
          : {}),
        ...(term.status !== "CANCELLED" && term.status !== "ARCHIVED"
          ? { stay: { lateArrival: term.lateArrival, earlyDeparture: term.earlyDeparture } }
          : {}),
      })),
    mealsDecided: record.mealsFilled,
    healthDecided: record.healthFilled,
    amountDueCzk,
    amountPaidCzk,
    amountOwedCzk: computeAmountOwed(amountDueCzk, amountPaidCzk),
    paymentStatus: computePaymentStatus(amountDueCzk, amountPaidCzk),
    // All terms waitlisted: nothing to pay yet, so no payment details (US-25).
    paymentDetails: details,
    canSimulatePayment,
    simulatedPayments: record.terms
      .flatMap((term) =>
        term.payments
          .filter((payment) => payment.source === "SIMULATION")
          .map((payment) => ({
            termId: term.termId,
            amountCzk: payment.amountCzk,
            createdAt: payment.createdAt,
          })),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((payment) => ({ ...payment, createdAt: payment.createdAt.toISOString() })),
    organizationContact: {
      name: record.organizationName,
      email: record.contactEmail,
      phone: record.contactPhone,
    },
  }
}
