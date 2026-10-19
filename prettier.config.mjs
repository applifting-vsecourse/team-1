/**
 * The one code style of the repo. Root files use it as is; each app extends it
 * only with its own plugins (import order, Tailwind class order, JSON sorting),
 * never with different style options.
 * @type {import('prettier').Config}
 */
const config = {
  printWidth: 100,
  semi: false,
  trailingComma: "all",
  singleAttributePerLine: true,
  endOfLine: "lf",
}

export default config
