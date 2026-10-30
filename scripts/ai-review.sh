#!/usr/bin/env bash
# AI review of the current branch against origin/main, using the shared
# `reviewer` agent (.claude/agents/reviewer.md) and the issues the PR closes.
# Runs on the Pi runner (.github/workflows/ai-review.yml) or by hand (`pnpm ai-review`).
# Exits 1 only when the agent reports a BLOCKER; every other failure (no CLI,
# no network, timeout) warns and exits 0 — CI is the hard gate.
#
#   scripts/ai-review.sh [base]       base defaults to origin/main
#
# Env:
#   AI_REVIEW_MODEL      model alias (default: sonnet; the Pi runner uses haiku)
#   AI_REVIEW_BUDGET     max USD per run for API-key users (default: 0.50)
#   AI_REVIEW_MAX_BYTES  diff size cap (default: 150000); bigger diffs are cut
#   AI_REVIEW_PR         PR number (default: the PR of the current branch)
#   AI_REVIEW_SETTING_SOURCES  e.g. `user` on the Pi, so a PR's .claude/ settings
#                        (hooks, MCP) are not loaded on the shared runner
set -uo pipefail

if [ -n "${CI:-}" ]; then
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
story_max_bytes=20000

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
truncated=""
if [ "${#diff}" -gt "$max_bytes" ]; then
  truncated="TRUNCATED: ${#diff} $max_bytes"
  diff="${diff:0:$max_bytes}"
  note="The diff was cut at $max_bytes bytes; review what is shown and open files for the rest if needed."
fi

# The issues the PR closes, so the agent can check the acceptance criteria.
story=""
if command -v gh >/dev/null 2>&1; then
  issues="$(gh pr view ${AI_REVIEW_PR:-} --json closingIssuesReferences --jq '.closingIssuesReferences[].number' 2>/dev/null)" || issues=""
  for n in $issues; do
    story+="$(gh issue view "$n" --json number,title,body \
      --template '# #{{.number}} {{.title}}{{"\n\n"}}{{.body}}{{"\n\n"}}' 2>/dev/null)"$'\n\n'
  done
  story="${story:0:$story_max_bytes}"
fi

extra=()
if [ -n "${AI_REVIEW_SETTING_SOURCES:-}" ]; then
  extra+=(--setting-sources "$AI_REVIEW_SETTING_SOURCES" --strict-mcp-config)
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
log="$(git rev-parse --git-dir)/ai-review-last.txt"

echo "ai-review: reviewing $branch against $base with $model…"

output="$(
  printf 'Review branch %s against %s.\n%s\n\n<story>\n%s\n</story>\n\n```diff\n%s\n```\n' \
    "$branch" "$base" "$note" "$story" "$diff" |
    claude -p \
      --agent reviewer \
      --model "$model" \
      --tools Read,Grep,Glob \
      --max-budget-usd "$budget" \
      ${extra[@]+"${extra[@]}"} \
      2>&1
)"
status=$?

{
  [ -z "$truncated" ] || printf '%s\n' "$truncated"
  printf '%s\n' "$output"
} >"$log"

if [ $status -ne 0 ] || ! grep -q '^VERDICT: ' <<<"$output"; then
  echo "ai-review: review did not finish. Output: $log"
  exit 0
fi

grep -E '^(BLOCKER|WARNING|NOTE) ' <<<"$output" || true

if grep -q '^VERDICT: BLOCK' <<<"$output"; then
  echo
  echo "ai-review: BLOCKER found (full output: $log)."
  exit 1
fi

echo "ai-review: pass"

# The reviewer above can't open Figma. Nudge, don't run: it needs the Figma MCP and is slow.
if git diff --name-only "$merge_base"...HEAD -- 'apps/frontend/src/routes/**' 'apps/frontend/src/features/**/components/**' \
  | grep -q '\.tsx$'; then
  echo "ai-review: UI changed — before the PR run @design-reviewer <US-xx> in Claude Code (compares with the Figma frames)."
fi
