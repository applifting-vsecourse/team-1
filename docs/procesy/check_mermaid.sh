#!/usr/bin/env bash
# Kontrola syntaxe .mmd souborů: ./check_mermaid.sh soubor.mmd [...]
# Závislosti (mermaid 10.3.0, jsdom) se při prvním spuštění nainstalují do cache mimo repo,
# takže se nemění package.json ani lockfile.
set -euo pipefail
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cache="${XDG_CACHE_HOME:-$HOME/.cache}/togena-mermaid-check"
if [ ! -d "$cache/node_modules/mermaid" ]; then
  mkdir -p "$cache"
  (cd "$cache" && npm init -y >/dev/null && npm i mermaid@10.3.0 jsdom >/dev/null 2>&1)
fi
cp "$dir/check_mermaid.mjs" "$cache/check_mermaid.mjs"
files=()
for f in "$@"; do files+=("$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"); done
cd "$cache" && node check_mermaid.mjs "${files[@]}"
