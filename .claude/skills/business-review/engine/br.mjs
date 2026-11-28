#!/usr/bin/env node
// Single entry point: `br.mjs` runs the latest review, `br.mjs new` creates one from the board.
await import(process.argv[2] === "new" ? "./new.mjs" : "./run.mjs")
