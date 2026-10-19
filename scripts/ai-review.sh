#!/usr/bin/env bash
# AI review of the current branch against origin/main, using the shared
# `reviewer` agent (.claude/agents/reviewer.md). Exits 1 only when the agent
# reports a BLOCKER; every other failure (no CLI, no network, timeout) warns
# and lets the push through — CI is the hard gate, this is an early signal.
#
#   scripts/ai-review.sh [base]       base defaults to origin/main
#
# Env:
#   SKIP_AI_REVIEW=1     skip the review
#   AI_REVIEW_MODEL      model alias (default: sonnet; the Pi runner uses haiku)
#   AI_REVIEW_BUDGET     max USD per run for API-key users (default: 0.50)
#   AI_REVIEW_MAX_BYTES  diff size cap (default: 150000); bigger diffs are cut
#   AI_REVIEW_SETTING_SOURCES  e.g. `user` on the Pi, so a PR's .claude/ settings
#                        (hooks, MCP) are not loaded on the shared runner
set -uo pipefail

if [ "${SKIP_AI_REVIEW:-}" = "1" ] || [ -n "${CI:-}" ]; then
  exit 0
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "ai-review: claude CLI not found, skipping (https://claude.com/claude-code)"
  exit 0
fi

base="${1:-origin/main}"
model="${AI_REVIEW_MODEL:-sonnet}"
budget="${AI_REVIEW_BUDGET:-0.50}"
max_bytes="${AI_REVIEW_MAX_BYTES:-150000}"

root="$(git rev-parse --show-toplevel)"
cd "$root" || exit 0

merge_base="$(git merge-base HEAD "$base" 2>/dev/null)" || {
  echo "ai-review: cannot find merge base with $base, skipping"
  exit 0
}

# Generated files only add noise and tokens.
diff="$(git diff "$merge_base"...HEAD -- . \
  ':(exclude)pnpm-lock.yaml' \
  ':(exclude)apps/frontend/src/routeTree.gen.ts' \
  ':(exclude)apps/backend/src/generated/**')"

if [ -z "$diff" ]; then
  exit 0
fi

note=""
if [ "${#diff}" -gt "$max_bytes" ]; then
  diff="${diff:0:$max_bytes}"
  note="The diff was cut at $max_bytes bytes; review what is shown and open files for the rest if needed."
fi

extra=()
if [ -n "${AI_REVIEW_SETTING_SOURCES:-}" ]; then
  extra+=(--setting-sources "$AI_REVIEW_SETTING_SOURCES" --strict-mcp-config)
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
log="$(git rev-parse --git-dir)/ai-review-last.txt"

echo "ai-review: reviewing $branch against $base with $model (SKIP_AI_REVIEW=1 to skip)…"

output="$(
  printf 'Review branch %s against %s.\n%s\n\n```diff\n%s\n```\n' \
    "$branch" "$base" "$note" "$diff" |
    claude -p \
      --agent reviewer \
      --model "$model" \
      --tools Read,Grep,Glob \
      --max-budget-usd "$budget" \
      ${extra[@]+"${extra[@]}"} \
      2>&1
)"
status=$?

printf '%s\n' "$output" >"$log"

if [ $status -ne 0 ] || ! grep -q '^VERDICT: ' <<<"$output"; then
  echo "ai-review: review did not finish, letting the push through. Output: $log"
  exit 0
fi

grep -E '^(BLOCKER|WARNING|NOTE) ' <<<"$output" || true

if grep -q '^VERDICT: BLOCK' <<<"$output"; then
  echo
  echo "ai-review: push stopped by a BLOCKER (full output: $log)."
  echo "Fix it, or push anyway with: SKIP_AI_REVIEW=1 git push"
  exit 1
fi

echo "ai-review: pass"

# The reviewer above can't open Figma. Nudge, don't run: it needs the Figma MCP and is slow.
if git diff --name-only "$merge_base"...HEAD -- 'apps/frontend/src/routes/**' 'apps/frontend/src/features/**/components/**' \
  | grep -q '\.tsx$'; then
  echo "ai-review: UI changed — before the PR run @design-reviewer <US-xx> in Claude Code (compares with the Figma frames)."
fi
