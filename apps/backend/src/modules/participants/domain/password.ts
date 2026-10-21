/** Own passwords of participants have at least 8 characters (docs/PROJEKT.md, section 5). */
export const MIN_PASSWORD_LENGTH = 8

export const isValidPassword = (password: unknown): password is string =>
  typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH
