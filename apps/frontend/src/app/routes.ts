// Every page of the app in one place. URLs are Czech (docs/PROJEKT.md, section 9);
// pass params separately: <Link to={ROUTES.organizer.event} params={{ eventId }} />.
export const ROUTES = {
  home: "/",

  applicationForm: "/prihlaska/$token",
  applicationConfirmation: "/prihlaska/potvrzeni/$accessToken",

  organizer: {
    login: "/organizator/prihlaseni",
    dashboard: "/organizator",
    events: "/organizator/akce",
    newEvent: "/organizator/akce/nova",
    event: "/organizator/akce/$eventId",
    eventTerms: "/organizator/akce/$eventId/terminy",
    eventRooms: "/organizator/akce/$eventId/ubytovani",
    eventApplications: "/organizator/akce/$eventId/prihlasky",
    account: "/organizator/ucet",
  },

  participant: {
    login: "/ucastnik/prihlaseni",
    setPassword: "/ucastnik/nastaveni-hesla",
    applications: "/ucastnik",
    account: "/ucastnik/ucet",
  },
} as const
