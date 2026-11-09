// The registration hands the one-time token of the staging bypass to the "Verify your e-mail"
// screen in the history state (never the URL). The token is short-lived and works once.
declare module "@tanstack/react-router" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- module augmentation needs an interface
  interface HistoryState {
    bypassToken?: string
  }
}

export {}
