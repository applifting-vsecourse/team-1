import base from "../../prettier.config.mjs"

/** @type {import('prettier').Config} */
const config = {
  ...base,
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
  importOrder: ["<THIRD_PARTY_MODULES>", "src/(.*)", "^[./]"],
  importOrderParserPlugins: ["typescript", "decorators-legacy"],
}

export default config
