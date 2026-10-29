#!/usr/bin/env bash
# Turns the `reviewer` agent's plain-text output (scripts/ai-review.sh) into the
# Markdown PR comment posted by .github/workflows/ai-review.yml. Plain bash: the
# Pi runner has no Node.
#
#   scripts/ai-review-comment.sh <log> <model> <sha>
#
# Env: GITHUB_REPOSITORY (owner/repo) for links to the reviewed lines.
set -uo pipefail

log="$1"
model="$2"
sha="$3"
blob="https://github.com/${GITHUB_REPOSITORY:-}/blob/$sha"

blockers=()
warnings=()
notes=()
verdict=""

# `path:42 — text` → one table row: file name linked to the line, full path on hover.
row() {
  local finding="$1" loc text path anchor
  if [[ "$finding" =~ ^([^[:space:]]+)\ —\ (.*)$ ]]; then
    loc="${BASH_REMATCH[1]}"
    text="${BASH_REMATCH[2]}"
    path="${loc%%:*}"
    anchor=""
    [[ "$loc" == *:* ]] && anchor="#L${loc#*:}"
    printf '| [`%s`](%s/%s%s "%s") | %s |\n' "${loc##*/}" "$blob" "$path" "$anchor" "$path" "${text//|/\\|}"
  else
    printf '| | %s |\n' "${finding//|/\\|}"
  fi
}

while IFS= read -r l || [ -n "$l" ]; do
  case "$l" in
    "BLOCKER "*) blockers+=("$(row "${l#BLOCKER }")") ;;
    "WARNING "*) warnings+=("$(row "${l#WARNING }")") ;;
    "NOTE "*) notes+=("$(row "${l#NOTE }")") ;;
    "VERDICT: "*) verdict="${l#VERDICT: }" ;;
  esac
done <"$log"

nb=${#blockers[@]}
nw=${#warnings[@]}
nn=${#notes[@]}

section() {
  local title="$1"
  shift
  [ $# -gt 0 ] || return 0
  printf '\n### %s\n\n| Kde | Co |\n| --- | --- |\n' "$title"
  printf '%s\n' "$@"
}

# Czech plural: 1 blocker, 2–4 blockery, 5+ blockerů.
count() {
  local n=$1 one=$2 few=$3 many=$4
  if [ "$n" -eq 1 ]; then echo "1 $one"; elif [ "$n" -le 4 ]; then echo "$n $few"; else echo "$n $many"; fi
}

summary=()
[ "$nb" -gt 0 ] && summary+=("$(count "$nb" blocker blockery blockerů)")
[ "$nw" -gt 0 ] && summary+=("$(count "$nw" varování varování varování)")
[ "$nn" -gt 0 ] && summary+=("$(count "$nn" poznámka poznámky poznámek)")
joined=""
for s in ${summary[@]+"${summary[@]}"}; do joined="${joined:+$joined · }$s"; done

echo '<!-- ai-review -->'
case "$verdict" in
  BLOCK)
    printf '> [!CAUTION]\n> **AI review: blokuje merge** — %s\n' "$joined"
    ;;
  PASS)
    if [ -z "$joined" ]; then
      printf '> [!TIP]\n> **AI review: v pořádku** — nic k připomínkám\n'
    else
      printf '> [!TIP]\n> **AI review: bez blockerů** — %s\n' "$joined"
    fi
    ;;
  *)
    printf '> [!WARNING]\n> **AI review nedoběhlo.** Nejčastěji jde o vyčerpaný limit předplatného nebo strop `AI_REVIEW_BUDGET`.\n'
    printf '\n<details><summary>Výstup agenta</summary>\n\n```\n%s\n```\n\n</details>\n' "$(cat "$log")"
    ;;
esac

section '⛔ Blockery — opravit před mergem' ${blockers[@]+"${blockers[@]}"}
section '⚠️ Varování — porušená pravidla, nic nerozbíjí' ${warnings[@]+"${warnings[@]}"}
section '💡 Poznámky' ${notes[@]+"${notes[@]}"}

printf '\n<sub>🤖 Model `%s` · commit `%s` · znovu spustíš komentářem `/ai-review`</sub>\n' "$model" "${sha:0:7}"
