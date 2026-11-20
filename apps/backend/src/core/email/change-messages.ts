import type { Locale } from "./locale"

// Approved transactional copy from docs/emaily/TEXTY.md.
export const changeMessages = {
  cs: {
    CONFIRMED: {
      subject: (event: string): string => `Účast potvrzena: ${event}`,
      preview: "Potvrzení účasti a údaje k platbě.",
      heading: "Účast je potvrzená",
      body: "Účast v uvedeném termínu byla potvrzena. Platební údaje najdete níže.",
    },
    WAITLISTED: {
      subject: (event: string): string => `Zařazení mezi náhradníky: ${event}`,
      preview: "Přihláška je zařazena mezi náhradníky.",
      heading: "Přihláška je mezi náhradníky",
      body: "Přihláška v uvedeném termínu byla zařazena mezi náhradníky. Pokud bude účast potvrzena, informujeme vás e-mailem. Za tento termín zatím nic neplaťte.",
    },
    REJECTED: {
      subject: (event: string): string => `Přihláška zamítnuta: ${event}`,
      preview: "Organizátor zamítl účast v uvedeném termínu.",
      heading: "Přihláška byla zamítnuta",
      body: "Organizátor zamítl účast v uvedeném termínu. Přihláška v tomto termínu je zrušená. Zrušení nemusíte potvrzovat.",
    },
    CANCELLED: {
      subject: (event: string): string => `Odhlášení potvrzeno: ${event}`,
      preview: "Potvrzení odhlášení z uvedeného termínu.",
      heading: "Odhlášení je potvrzené",
      body: "Potvrzujeme odhlášení z uvedeného termínu. Přihláška v tomto termínu je zrušená.",
    },
    NO_BED_FREED: {
      subject: (event: string): string => `Přihláška byla zrušena: ${event}`,
      preview: "Zrušení přihlášky náhradníka v uvedeném termínu.",
      heading: "Přihláška byla zrušena",
      body: "Účast v uvedeném termínu nebyla potvrzena. Přihláška v tomto termínu je proto zrušená. Zrušení nemusíte potvrzovat.",
    },
    CANCELLED_BY_ORGANIZER: {
      subject: (event: string): string => `Přihláška zrušena organizátorem: ${event}`,
      preview: "Organizátor zrušil přihlášku vedenou mezi náhradníky.",
      heading: "Přihláška byla zrušena organizátorem",
      body: "Organizátor zrušil přihlášku v uvedeném termínu, ve kterém byla vedena mezi náhradníky. Zrušení nemusíte potvrzovat.",
    },
    WITHDRAWN: {
      subject: (event: string): string => `Potvrzení účasti odvoláno: ${event}`,
      preview: "Organizátor odvolal potvrzení a zařadil přihlášku mezi náhradníky.",
      heading: "Potvrzení účasti bylo odvoláno",
      body: "Organizátor odvolal potvrzení účasti v uvedeném termínu a zařadil přihlášku mezi náhradníky. Za tento termín zatím nic neplaťte. Pokud bude účast znovu potvrzena, informujeme vás e-mailem.",
    },
    TERM_CANCELLED: {
      subject: (event: string): string => `Termín akce zrušen: ${event}`,
      preview: "Organizátor zrušil termín akce a přihlášku v tomto termínu.",
      heading: "Termín akce byl zrušen",
      body: "Organizátor zrušil uvedený termín akce. Přihláška v tomto termínu je proto zrušená.",
    },
    SETTLED: {
      subject: (event: string): string => `Platba přijata: ${event}`,
      preview: "Přihláška v uvedeném termínu je plně zaplacená.",
      heading: "Platbu jsme zaevidovali",
      body: "Zaevidovali jsme platbu a přihláška v uvedeném termínu je plně zaplacená. Za tento termín již nic nedlužíte.",
    },
    CORRECTED: {
      subject: (event: string): string => `Po opravě platby zbývá doplatit: ${event}`,
      preview:
        "Předchozí potvrzení o úplném zaplacení již neplatí. Níže najdete částku k doplacení.",
      heading: "Po opravě platby zbývá nedoplatek",
      body: "Po opravě evidence platby organizátorem zbývá u přihlášky v uvedeném termínu doplatit částku uvedenou níže. Předchozí potvrzení o úplném zaplacení již neplatí. Zaplaťte prosím nedoplatek podle uvedených platebních údajů.",
    },
    TERMS_CHANGED: {
      subject: (event: string): string => `Změny v přihlášce: ${event}`,
      preview: "Přehled změn stavu přihlášky v jednotlivých termínech.",
      heading: "Změny v přihlášce",
      body: "U vaší přihlášky se změnil stav v níže uvedených termínech.",
    },
  },
  en: {
    CONFIRMED: {
      subject: (event: string): string => `Place confirmed: ${event}`,
      preview: "Your place is confirmed. Payment details are included.",
      heading: "The place is confirmed",
      body: "The place in the term shown below has been confirmed. Payment details are included below.",
    },
    WAITLISTED: {
      subject: (event: string): string => `Application waitlisted: ${event}`,
      preview: "The application has been placed on the waiting list.",
      heading: "The application is waitlisted",
      body: "The application for the term shown below has been waitlisted. We will e-mail you if the place is confirmed. Please do not pay for this term yet.",
    },
    REJECTED: {
      subject: (event: string): string => `Application rejected: ${event}`,
      preview: "The organiser has rejected the application for the term shown below.",
      heading: "The application has been rejected",
      body: "The organiser has rejected the application for the term shown below. The application for this term is now cancelled. You do not need to confirm the cancellation.",
    },
    CANCELLED: {
      subject: (event: string): string => `Cancellation confirmed: ${event}`,
      preview: "Confirmation of cancellation for the term shown below.",
      heading: "The cancellation is confirmed",
      body: "We confirm the cancellation for the term shown below. The application for this term is now cancelled.",
    },
    NO_BED_FREED: {
      subject: (event: string): string => `Application cancelled: ${event}`,
      preview: "Cancellation of the waitlisted application for the term shown below.",
      heading: "Application cancelled",
      body: "The place in the term shown below was not confirmed. The application for this term is therefore cancelled. You do not need to confirm the cancellation.",
    },
    CANCELLED_BY_ORGANIZER: {
      subject: (event: string): string => `Application cancelled by the organiser: ${event}`,
      preview: "The organiser has cancelled the waitlisted application.",
      heading: "The application has been cancelled by the organiser",
      body: "The organiser has cancelled the application for the term shown below, where it was on the waiting list. You do not need to confirm the cancellation.",
    },
    WITHDRAWN: {
      subject: (event: string): string => `Place confirmation withdrawn: ${event}`,
      preview: "The organiser has withdrawn the confirmation and waitlisted the application.",
      heading: "The place confirmation has been withdrawn",
      body: "The organiser has withdrawn the place confirmation for the term shown below and waitlisted the application. Please do not pay for this term yet. We will e-mail you if the place is confirmed again.",
    },
    TERM_CANCELLED: {
      subject: (event: string): string => `Event term cancelled: ${event}`,
      preview: "The organiser has cancelled the event term and the application for it.",
      heading: "The event term has been cancelled",
      body: "The organiser has cancelled the event term shown below. The application for this term has therefore been cancelled.",
    },
    SETTLED: {
      subject: (event: string): string => `Payment received: ${event}`,
      preview: "The application for the term shown below is fully paid.",
      heading: "Your payment has been recorded",
      body: "We have recorded your payment and the application for the term shown below is fully paid. There is no outstanding balance for this term.",
    },
    CORRECTED: {
      subject: (event: string): string => `Payment correction: outstanding balance for ${event}`,
      preview:
        "The previous confirmation of full payment is no longer valid. The outstanding amount is shown below.",
      heading: "An outstanding balance remains after a payment correction",
      body: "Following the organiser’s correction of the payment record, the amount shown below remains outstanding for the application in this term. The previous confirmation of full payment is no longer valid. Please pay the outstanding amount using the payment details provided.",
    },
    TERMS_CHANGED: {
      subject: (event: string): string => `Changes to your application: ${event}`,
      preview: "A summary of application status changes for individual terms.",
      heading: "Changes to your application",
      body: "The status of your application has changed for the terms listed below.",
    },
  },
} satisfies Record<
  Locale,
  Record<
    string,
    { subject: (event: string) => string; preview: string; heading: string; body: string }
  >
>
