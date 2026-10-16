import csApplicationForm from "@/i18n/locales/cs/applicationForm.json"
import csAuth from "@/i18n/locales/cs/auth.json"
import csCommon from "@/i18n/locales/cs/common.json"
import csErrors from "@/i18n/locales/cs/errors.json"
import csEventOverview from "@/i18n/locales/cs/eventOverview.json"
import csEvents from "@/i18n/locales/cs/events.json"
import csLanding from "@/i18n/locales/cs/landing.json"
import csParticipant from "@/i18n/locales/cs/participant.json"
import enApplicationForm from "@/i18n/locales/en/applicationForm.json"
import enAuth from "@/i18n/locales/en/auth.json"
import enCommon from "@/i18n/locales/en/common.json"
import enErrors from "@/i18n/locales/en/errors.json"
import enEventOverview from "@/i18n/locales/en/eventOverview.json"
import enEvents from "@/i18n/locales/en/events.json"
import enLanding from "@/i18n/locales/en/landing.json"
import enParticipant from "@/i18n/locales/en/participant.json"

// One namespace per feature folder, so parallel streams edit different files
// (docs/PROJEKT.md, section 6). English is the source of truth for the keys.
export const resources = {
  en: {
    common: enCommon,
    errors: enErrors,
    auth: enAuth,
    landing: enLanding,
    events: enEvents,
    applicationForm: enApplicationForm,
    participant: enParticipant,
    eventOverview: enEventOverview,
  },
  cs: {
    common: csCommon,
    errors: csErrors,
    auth: csAuth,
    landing: csLanding,
    events: csEvents,
    applicationForm: csApplicationForm,
    participant: csParticipant,
    eventOverview: csEventOverview,
  },
} as const

export const defaultNS = "common"
