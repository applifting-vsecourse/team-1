import base from "../../prettier.config.mjs"

/** @type {import('prettier').Config} */
const config = {
  ...base,
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-sort-json",
    "prettier-plugin-tailwindcss",
  ],
  importOrder: [
    "^(react/(.*)$)|^(react$)",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@/(?!features/)(.*)$",
    "",
    "^@/features/(.*)$",
    "",
    "^[./]",
  ],
  jsonRecursiveSort: true,
  tailwindFunctions: ["cva", "cn"],
  tailwindStylesheet: "./src/styles/global.css",
  overrides: [
    {
      files: "*.svg",
      options: { parser: "html" },
    },
    {
      files: "tsconfig*.json",
      options: { jsonRecursiveSort: false },
    },
  ],
}

export default config
