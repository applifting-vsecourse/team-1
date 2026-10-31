// Every page of the app in one place. URLs are English and the same for every
// UI language (docs/PROJEKT.md, section 8); pass params separately:
// <Link to={ROUTES.organizer.event} params={{ eventId }} />.
export const ROUTES = {
  home: "/",

  applicationForm: "/apply/$token",
  applicationConfirmation: "/apply/confirmation/$accessToken",

  organizer: {
    login: "/organizer/login",
    events: "/organizer/events",
    newEvent: "/organizer/events/new",
    event: "/organizer/events/$eventId",
    eventTerms: "/organizer/events/$eventId/terms",
    eventRooms: "/organizer/events/$eventId/rooms",
    eventSettings: "/organizer/events/$eventId/settings",
    eventCapacity: "/organizer/events/$eventId/capacity",
    eventApplications: "/organizer/events/$eventId/applications",
    application: "/organizer/events/$eventId/applications/$applicationId",
    account: "/organizer/account",
  },

  participant: {
    login: "/participant/login",
    magicLink: "/participant/magic-link",
    setPassword: "/participant/set-password",
    applications: "/participant",
    application: "/participant/applications/$applicationId",
    account: "/participant/account",
  },
} as const
