// The registration form hands its password to the "Verify your e-mail" screen in the history
// state (never the URL), so the staging bypass can prove the caller registered the account.
declare module "@tanstack/react-router" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- module augmentation needs an interface
  interface HistoryState {
    password?: string
  }
}

export {}
