#!/usr/bin/env node
// Story helpers for the `/story` skill (.claude/skills/story/SKILL.md).
// Usage: node scripts/story.mjs check <issue>            is the story ready to build?
//        node scripts/story.mjs move <issue> "<status>"  move it on the board
import { execFileSync } from "node:child_process"

const OWNER = "applifting-vsecourse"
const REPO = "team-1"
const PROJECT = 12
const BUILDABLE = ["design: done", "design: not needed"]
// Agents move a card only this far; the tester and the product manager do the rest.
const AGENT_STATUSES = ["In progress", "Code review", "In Test"]

const gh = (...args) =>
  execFileSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
const graphql = (query) => JSON.parse(gh("api", "graphql", "-f", `query=${query}`)).data

const projectItem = (issue) => {
  const { repository } = graphql(`{
    repository(owner: "${OWNER}", name: "${REPO}") {
      issue(number: ${issue}) {
        projectItems(first: 20) {
          nodes {
            id
            project { number }
            fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
          }
        }
      }
    }
  }`)
  return repository.issue.projectItems.nodes.find((n) => n.project.number === PROJECT)
}

const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join("-")

const branchName = ({ number, title, labels }) => {
  const us = title.match(/^US-(\d+)\s+(.*)$/)
  if (us) return `feat/US-${us[1]}-${slugify(us[2])}`
  const prefix = labels.includes("bug") ? "fix" : "feat"
  return `${prefix}/${number}-${slugify(title)}`
}

const check = (number) => {
  const issue = JSON.parse(
    gh("issue", "view", number, "--json", "number,title,state,body,labels,assignees"),
  )
  const labels = issue.labels.map((l) => l.name)
  const me = gh("api", "user", "--jq", ".login")
  const others = issue.assignees.map((a) => a.login).filter((login) => login !== me)
  const blockers = JSON.parse(
    gh("api", `repos/${OWNER}/${REPO}/issues/${number}/dependencies/blocked_by`),
  ).filter((i) => i.state === "open")
  const status = projectItem(number)?.fieldValueByName?.name ?? "not on the board"

  const problems = [
    issue.state !== "OPEN" && "the issue is closed",
    !labels.some((l) => BUILDABLE.includes(l)) && `no label ${BUILDABLE.join(" / ")}`,
    !issue.body.includes("Akceptační kritéria") && "no acceptance criteria",
    /Otevřen(á otázka|é otázky)/.test(issue.body) && "an open question is still in the issue",
    others.length > 0 && `assigned to ${others.join(", ")}`,
    ...blockers.map((b) => `blocked by #${b.number} ${b.title}`),
  ].filter(Boolean)

  console.log(`#${issue.number} ${issue.title}`)
  console.log(`status: ${status}`)
  console.log(`labels: ${labels.join(", ")}`)
  console.log(`branch: ${branchName({ ...issue, labels })}`)
  for (const problem of problems) console.log(`NOT READY: ${problem}`)
  console.log(problems.length ? "VERDICT: NOT READY" : "VERDICT: READY")
  process.exitCode = problems.length ? 1 : 0
}

const move = (number, status) => {
  if (!AGENT_STATUSES.includes(status))
    throw new Error(`status must be one of: ${AGENT_STATUSES.join(", ")}`)
  const item = projectItem(number)
  if (!item) throw new Error(`#${number} is not on the board`)
  const { organization } = graphql(`{
    organization(login: "${OWNER}") {
      projectV2(number: ${PROJECT}) {
        id
        field(name: "Status") {
          ... on ProjectV2SingleSelectField { id options { id name } }
        }
      }
    }
  }`)
  const { id: projectId, field } = organization.projectV2
  const option = field.options.find((o) => o.name === status)
  gh(
    "project",
    "item-edit",
    "--id",
    item.id,
    "--project-id",
    projectId,
    "--field-id",
    field.id,
    "--single-select-option-id",
    option.id,
  )
  console.log(`#${number}: ${item.fieldValueByName?.name} → ${status}`)
}

const [command, number, status] = process.argv.slice(2)
if (command === "check" && /^\d+$/.test(number ?? "")) check(number)
else if (command === "move" && /^\d+$/.test(number ?? "") && status) move(number, status)
else {
  console.error('Usage: story.mjs check <issue> | move <issue> "<status>"')
  process.exitCode = 2
}
