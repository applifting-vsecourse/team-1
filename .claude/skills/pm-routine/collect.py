#!/usr/bin/env python3
"""Sběr dat pro skill pm-routine (jen čtení, žádné zápisy do GitHubu ani do repa).

    python3 collect.py [--pm Aadikk] [--since 2026-10-30T00:00:00Z] [--full]
             [--pr-state open|merged|all] [--pr-limit 100]

Výstup: JSON na stdout. `--since` omezí tickety na ty změněné od daného času
(PR se berou vždy všechna otevřená). `--full` bere všechny tickety.
Vyžaduje přihlášené `gh` a spuštění v repozitáři Togena.
"""
import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]
ASK_RE = re.compile(r"Dotaz na (Adama|PM|product manager)", re.I)
UNCLEAR_SECTIONS = ("Nejasnosti k byznys pravidlům", "Odchylky od Figmy", "Mimo rozsah story")


def gh(*args):
    r = subprocess.run(["gh", *args], capture_output=True, text=True, cwd=REPO_ROOT)
    if r.returncode != 0:
        sys.exit(f"gh {' '.join(args[:3])} selhalo: {r.stderr.strip()}")
    return json.loads(r.stdout) if r.stdout.strip() else None


def repo_slug():
    return gh("repo", "view", "--json", "nameWithOwner")["nameWithOwner"]


def section(body, title):
    m = re.search(rf"^##+ {re.escape(title)}\s*$(.*?)(?=^##+ |\Z)", body or "", re.S | re.M)
    return m.group(1).strip() if m else ""


def body_questions(body):
    """Dotazy na PM přímo v těle PR/ticketu (bývají bez označení v komentáři)."""
    out = []
    for line in (body or "").splitlines():
        if ASK_RE.search(line):
            out.append(line.strip(" -*"))
    return out


def summarize_comment(c, author_key="author"):
    a = c.get(author_key)
    login = a.get("login") if isinstance(a, dict) else (c.get("user") or {}).get("login")
    return {"id": c.get("id"), "author": login, "at": c.get("createdAt") or c.get("submittedAt") or c.get("created_at"),
            "url": c.get("url") or c.get("html_url"), "body": c.get("body", "")}


def thread_state(comments, pm):
    """Poslední označení PM a to, zda PM po něm odpověděl."""
    mention = f"@{pm}".lower()
    last_mention = None
    for c in comments:
        if c["author"] != pm and mention in (c["body"] or "").lower():
            last_mention = c
    last_pm = max((c for c in comments if c["author"] == pm), key=lambda c: c["at"] or "", default=None)
    answered = bool(last_mention and last_pm and (last_pm["at"] or "") > (last_mention["at"] or ""))
    # Poděkování a „zapracováno“ bez otázky nepotřebují odpověď; konečný úsudek dělá skill.
    asks = bool(last_mention and (ASK_RE.search(last_mention["body"] or "") or "?" in last_mention["body"]
                                  or re.search(r"prosím o (rozhodnutí|odpověď|potvrzení)", last_mention["body"] or "", re.I)))
    return {
        "last_mention_has_question": asks if last_mention else None,
        "last_mention_at": last_mention["at"] if last_mention else None,
        "last_mention_url": last_mention["url"] if last_mention else None,
        "last_pm_reply_at": last_pm["at"] if last_pm else None,
        "mention_answered": answered if last_mention else None,
    }


def collect_prs(slug, pm, state="open", limit=100):
    prs = gh("pr", "list", "--state", state, "--limit", str(limit),
             "--json", "number,title,author,headRefName,baseRefName,updatedAt,url,isDraft")
    out = []
    for p in prs:
        n = p["number"]
        d = gh("pr", "view", str(n), "--json", "body,comments,reviews")
        inline = gh("api", f"repos/{slug}/pulls/{n}/comments", "--paginate") or []
        comments = [summarize_comment(c) for c in d["comments"]]
        comments += [summarize_comment(r) | {"kind": "review"} for r in d["reviews"] if r.get("body")]
        comments += [summarize_comment(c) | {"kind": "inline"} for c in inline]
        comments = [c for c in comments if c["author"] not in ("github-actions", "chatgpt-codex-connector")]
        body = d["body"] or ""
        out.append({
            "number": n, "title": p["title"], "author": p["author"]["login"], "branch": p["headRefName"],
            "base": p["baseRefName"], "url": p["url"], "updated_at": p["updatedAt"], "draft": p["isDraft"],
            "closes": re.findall(r"Closes #(\d+)", body),
            "stacked_on": re.findall(r"Stojí na #(\d+)", body),
            "body_questions": body_questions(body),
            "body_sections": {s: section(body, s) for s in UNCLEAR_SECTIONS if section(body, s)},
            "unmet_criteria": [l.strip() for l in body.splitlines() if re.match(r"\s*- (❌|❓)", l)],
            "thread": thread_state(comments, pm),
            "comments": comments,
        })
    return out


def collect_issues(pm, since, full):
    fields = "number,title,state,labels,assignees,updatedAt,closedAt,url"
    if full:
        args = ["issue", "list", "--state", "all", "--limit", "300", "--json", fields]
    else:
        day = (since or (datetime.now(timezone.utc) - timedelta(days=2)).isoformat())[:10]
        args = ["issue", "list", "--state", "all", "--limit", "200", "--search", f"updated:>={day}", "--json", fields]
    out = []
    for i in gh(*args):
        d = gh("issue", "view", str(i["number"]), "--json", "body,comments")
        comments = [summarize_comment(c) for c in d["comments"]]
        body = d["body"] or ""
        out.append({
            "number": i["number"], "title": i["title"], "state": i["state"], "url": i["url"],
            "labels": [l["name"] for l in i["labels"]], "assignees": [a["login"] for a in i["assignees"]],
            "updated_at": i["updatedAt"], "closed_at": i["closedAt"],
            "open_questions_for_po": [l.strip() for l in body.splitlines() if "Otevřená otázka na PO" in l],
            "unchecked_criteria": len(re.findall(r"^\s*- \[ \]", body, re.M)),
            "thread": thread_state(comments, pm),
            "pm_comments_since": [c for c in comments if c["author"] == pm and (not since or (c["at"] or "") >= since)],
        })
    return out


def promises(prs, issues, pm):
    """Komentáře PM, které vypadají jako slib (heuristika, finální úsudek dělá skill)."""
    pat = re.compile(r"\b(dodám|dodam|aktualizuji|ověřím|overim|zjistím|zjistim|udělám|udelam|založím|zalozim|navrhuju|doplním|doplnim)\b", re.I)
    out = []
    for src, kind in ((prs, "pr"), (issues, "issue")):
        for x in src:
            cs = x["comments"] if kind == "pr" else x["pm_comments_since"]
            for c in cs:
                if c["author"] == pm and pat.search(c["body"] or ""):
                    out.append({"kind": kind, "number": x["number"], "url": c["url"], "at": c["at"],
                                "excerpt": next((l for l in c["body"].splitlines() if pat.search(l)), "")[:300]})
    return out


def registry():
    q = yaml.safe_load((REPO_ROOT / "docs/otevrene-otazky/otazky.yaml").read_text(encoding="utf-8"))
    d = yaml.safe_load((REPO_ROOT / "docs/rozhodnuti/rozhodnuti.yaml").read_text(encoding="utf-8"))["rozhodnuti"]
    otazky = q["otazky"]
    live = [o for o in otazky if o["stav"] != "uzavreno"]
    return {
        "questions_total": len(otazky),
        "questions_by_owner": {r: sum(1 for o in live if o["ceka_na"] == r and o["stav"] == "otevreno") for r in q["role"]},
        "decided_not_written": [{"id": o["id"], "ref": o.get("rozhodnuti_ref")} for o in otazky if o["stav"] == "rozhodnuto"],
        "tickets_to_create": [{"question": o["id"], "label": t["label"]} for o in otazky
                              for t in o.get("navazne_tickety") or [] if not t.get("url")],
        "decisions_total": len(d),
        "decisions_proposed": [x["id"] for x in d if x["stav"] == "navrh"],
        "pending_docs": [{"decision": x["id"], "file": t["soubor"]} for x in d if x["stav"] in ("platne", "navrh")
                         for t in x.get("dokumentace") or [] if t["stav"] == "ceka"],
        "known_question_sources": sorted({z.get("url", "") for o in otazky for z in o.get("zdroje") or [] if z.get("url")}),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pm", default="Aadikk")
    ap.add_argument("--since")
    ap.add_argument("--full", action="store_true")
    ap.add_argument("--pr-state", default="open", choices=["open", "merged", "all"], help="open = běžný provoz; merged/all jen pro kontrolu skriptu")
    ap.add_argument("--pr-limit", type=int, default=100)
    a = ap.parse_args()
    slug = repo_slug()
    prs = collect_prs(slug, a.pm, a.pr_state, a.pr_limit)
    issues = collect_issues(a.pm, a.since, a.full)
    json.dump({"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "repo": slug, "pm": a.pm,
               "since": a.since, "prs": prs, "issues": issues, "promises": promises(prs, issues, a.pm),
               "registry": registry()}, sys.stdout, ensure_ascii=False, indent=1)


main()
