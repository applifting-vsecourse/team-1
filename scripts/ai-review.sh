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
#   AI_REVIEW_ENGINE     `claude` (default) or `codex` (OpenAI Codex CLI signed in with
#                        a ChatGPT plan; the Pi runner uses it)
#   AI_REVIEW_MODEL      model (claude: alias, default sonnet; codex: default of the CLI)
#   AI_REVIEW_BUDGET     max USD per run for API-key users (default: 0.50; claude only)
#   AI_REVIEW_MAX_BYTES  diff size cap (default: 150000); bigger diffs are cut
#   AI_REVIEW_PR         PR number (default: the PR of the current branch)
#   AI_REVIEW_SETTING_SOURCES  e.g. `user` on the Pi, so a PR's .claude/ settings
#                        (hooks, MCP) are not loaded on the shared runner
set -uo pipefail

if [ -n "${CI:-}" ]; then
  exit 0
fi

engine="${AI_REVIEW_ENGINE:-claude}"
case "$engine" in
  claude) url="https://claude.com/claude-code" ;;
  codex) url="https://github.com/openai/codex" ;;
  *)
    echo "ai-review: unknown AI_REVIEW_ENGINE '$engine', skipping"
    exit 0
    ;;
esac
if ! command -v "$engine" >/dev/null 2>&1; then
  echo "ai-review: $engine CLI not found, skipping ($url)"
  exit 0
fi

base="${1:-origin/main}"
if [ "$engine" = claude ]; then
  model="${AI_REVIEW_MODEL:-sonnet}"
else
  model="${AI_REVIEW_MODEL:-}"
fi
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

branch="$(git rev-parse --abbrev-ref HEAD)"
log="$(git rev-parse --git-dir)/ai-review-last.txt"

echo "ai-review: reviewing $branch against $base with $engine${model:+ ($model)}…"

prompt="$(printf 'Review branch %s against %s.\n%s\n\n<story>\n%s\n</story>\n\n```diff\n%s\n```\n' \
  "$branch" "$base" "$note" "$story" "$diff")"

if [ "$engine" = claude ]; then
  extra=()
  if [ -n "${AI_REVIEW_SETTING_SOURCES:-}" ]; then
    extra+=(--setting-sources "$AI_REVIEW_SETTING_SOURCES" --strict-mcp-config)
  fi
  output="$(
    printf '%s' "$prompt" |
      claude -p \
        --agent reviewer \
        --model "$model" \
        --tools Read,Grep,Glob \
        --max-budget-usd "$budget" \
        ${extra[@]+"${extra[@]}"} \
        2>&1
  )"
  status=$?
else
  # Codex has no agents: the reviewer's prompt (without its front matter) goes first.
  # `AI_REVIEW_AGENT` lets the runner pass the copy taken from main.
  agent="${AI_REVIEW_AGENT:-$root/.claude/agents/reviewer.md}"
  instructions="$(awk 'NR==1 && /^---$/ {fm=1; next} fm && /^---$/ {fm=0; next} !fm' "$agent")"
  last="$(mktemp)"
  # Read-only sandbox: it can read and grep the checkout, not write or reach the network.
  # project_doc_max_bytes=0: an AGENTS.md from the PR doesn't get to rewrite the rules.
  codex_out="$(
    printf '%s\n\nYour tools are read-only shell commands (cat, grep, ls) instead of Read, Grep and Glob.\n\n%s' \
      "$instructions" "$prompt" |
      codex exec \
        --sandbox read-only \
        --skip-git-repo-check \
        --color never \
        -c project_doc_max_bytes=0 \
        ${model:+--model "$model"} \
        --output-last-message "$last" \
        - 2>&1
  )"
  status=$?
  if [ -s "$last" ]; then output="$(cat "$last")"; else output="$codex_out"; fi
  rm -f "$last"
fi

# Scrub anything that looks like a credential before it reaches a log or a PR comment:
# a diff can carry a prompt injection asking the agent to print the runner's login.
output="$(sed -E \
  -e 's/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(\.[A-Za-z0-9_-]+)?/[REDACTED]/g' \
  -e 's/(sk|rt|sess)[-_][A-Za-z0-9_-]{16,}/[REDACTED]/g' \
  -e 's/(gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}/[REDACTED]/g' \
  -e 's/("?(access|refresh|id)_token"?|api_key|API_KEY)([":= ]+)[^",[:space:]]+/\1\3[REDACTED]/g' \
  -e 's/[A-Za-z0-9+\/_-]{60,}={0,2}/[REDACTED]/g' <<<"$output")"

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
