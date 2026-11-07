// Every page of the app in one place. URLs are English and the same for every
// UI language (docs/PROJEKT.md, section 8); pass params separately:
// <Link to={ROUTES.organizer.event} params={{ eventId }} />.
export const ROUTES = {
  home: "/",

  catalog: "/catalog",
  // The permanent page of an event at its public token (US-22); the catalog links to it.
  event: "/events/$publicToken",

  // Where the verification link of an e-mail change ends (US-125); the backend adds `?error=` when it fails.
  emailChange: "/email-change",

  applicationForm: "/apply/$token",
  applicationConfirmation: "/apply/confirmation/$accessToken",

  organizer: {
    // Redirects to the overview of the last opened event, or to the events list.
    home: "/organizer",
    login: "/organizer/login",
    register: "/organizer/register",
    verifyEmail: "/organizer/verify-email",
    onboarding: "/organizer/onboarding",
    events: "/organizer/events",
    newEvent: "/organizer/events/new",
    event: "/organizer/events/$eventId",
    eventTerms: "/organizer/events/$eventId/terms",
    eventRooms: "/organizer/events/$eventId/rooms",
    eventSettings: "/organizer/events/$eventId/settings",
    eventCapacity: "/organizer/events/$eventId/capacity",
    eventApplications: "/organizer/events/$eventId/applications",
    eventPayments: "/organizer/events/$eventId/payments",
    eventMeals: "/organizer/events/$eventId/meals",
    eventMealOptions: "/organizer/events/$eventId/meals/options",
    eventCancellationTerms: "/organizer/events/$eventId/payments/cancellation",
    application: "/organizer/events/$eventId/applications/$applicationId",
    account: "/organizer/account",
  },

  participant: {
    login: "/participant/login",
    magicLink: "/participant/magic-link",
    setPassword: "/participant/set-password",
    applications: "/participant",
    application: "/participant/applications/$applicationId",
    applicationMeals: "/participant/applications/$applicationId/meals",
    account: "/participant/account",
  },
} as const
