# Issue tracker: GitHub Issues

Issues, PRDs, and wayfinder maps for this project live as **GitHub issues** on
`jsbellamy/nightglass`. Use the `gh` CLI (`gh issue …`, `gh api …`).

## Conventions

- One issue per unit of work; triage state is the issue's open/closed state plus labels.
- Long-form assets (research summaries, PRDs, prototypes) live as Markdown files
  under `docs/` and are **linked** from the issue body, not pasted in.
- Comments and conversation history are GitHub issue comments.

## When a skill says "publish to the issue tracker"

Create a new issue with `gh issue create`. Put long-form artifacts in `docs/` and
link them from the body.

## When a skill says "fetch the relevant ticket"

`gh issue view <number>`. The user will normally pass its number or URL.

## Wayfinding operations

- **Map**: a single issue labelled `wayfinder:map`. Its body holds Destination,
  Notes, Decisions so far, Not yet specified, and Out of scope. Find it with
  `gh issue list --label wayfinder:map`.
- **Child ticket**: a **sub-issue** of the map (GitHub native sub-issues), holding
  one question in its body. It carries exactly one type label:
  `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or
  `wayfinder:task`.
  - Attach: `gh api repos/jsbellamy/nightglass/issues/<map>/sub_issues -F sub_issue_id=<child_id>`
    where `<child_id>` is the child's REST id (`gh api repos/jsbellamy/nightglass/issues/<n> --jq .id`).
  - List children: `gh api repos/jsbellamy/nightglass/issues/<map>/sub_issues`.
- **Blocking**: GitHub has no native issue-blocking relationship, so use a body
  convention — a `Blocked by: #N, #N` line near the top. A ticket is unblocked
  when every listed issue is closed. (Sub-issues give the parent its
  completion rollup, but do not express blocking between siblings.)
- **Frontier**: the map's open sub-issues that are unblocked (every `Blocked by:`
  issue closed) and unclaimed (no assignee); lowest number wins.
- **Claim**: assign the ticket to the driving dev before any work —
  `gh issue edit <n> --add-assignee @me`. An open, unassigned sub-issue is unclaimed.
- **Resolve**: post the answer as a comment (`gh issue comment <n>`), close the
  issue (`gh issue close <n> --reason completed`), and append a one-line gist plus
  the issue link to the map body's "Decisions so far" section
  (`gh issue edit <map> --body-file …`).
