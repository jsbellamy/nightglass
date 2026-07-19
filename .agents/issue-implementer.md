# Issue implementer

Implement exactly one Nightglass GitHub issue end to end and open a pull
request. Pass the issue number to this agent. Work in an isolated worktree when
the runtime supports worktrees.

## Process

1. Read `AGENTS.md`, `CONTEXT.md`, and the ADRs in `docs/adr/` before making
   changes. Use the glossary's vocabulary in code, tests, commits, and the pull
   request.
2. Fetch the issue with `gh issue view <N>` (use `/opt/homebrew/bin/gh` if `gh`
   is not on `PATH`). Wave issues are self-contained: the `## Touches`
   manifest's `read:` lines are your context set — read them before editing —
   and the acceptance criteria define the work's scope; do not implement beyond
   them. The manifest is expected scope, not a straitjacket: justify each
   out-of-manifest file in the PR body.
3. Create `issue-<N>-<slug>` from `main`.
4. Branch on the issue's `## Slice type`:
   - **code** — invoke `/tdd` explicitly, then work test-first at the seams in
     `docs/agents/code-style.md` (that doc is the standing seam agreement). If
     the runtime does not expose `/tdd`, follow the equivalent red-green
     workflow at the same seams. Run `npm run typecheck` and focused test files
     during implementation; run the full `npm test` suite before publishing.
   - **asset** — follow the acquisition loop in
     `docs/agents/asset-generation.md` end to end. The issue body carries the
     finished generation prompt and its intended read: run the prompt as
     written, judge the result against the stated read, and keep the archived
     raw plus provenance sidecar so `assets:verify` proves a byte-identical
     rebuild.
5. Before publishing, make an **acceptance matrix** containing every checkbox
   from the live issue. For each row, state `met` plus specific evidence at the
   seam the criterion names: a test name, code location, command result, or
   attached review sheet. Never infer a visual or integration criterion from a
   merely related test — readability and review-sheet criteria need the sheet
   attached, and byte-identity criteria need the `assets:verify` result. If any
   row cannot be supported, stop and report the issue as incomplete rather than
   opening a completion PR.
6. Commit only the issue's changes. Let any commit hooks run; never bypass them.
   Push with `git push -u origin <branch>`, then create a pull request whose
   body includes a summary, verification details, the complete acceptance
   matrix, and `Closes #<N>`.
7. Report the PR URL, what was built, test results, the full matrix, and
   anything deliberately left out of scope.

## Constraints

- Respect the simulation boundary (`docs/vertical-slice-spec.md` §9): the
  Engine stays caller-pumped and chunk-size-neutral; time and RNG are injected;
  Presentation Events carry domain facts, never asset names.
- An issue body labeled **interim** is deliberate: build the interim as
  specified and leave the replacement to the named later issue.
- Do not modify another issue's scope, work directly on `main`, or merge the
  pull request yourself.
- Do not require a specific AI provider, model, or reasoning/effort setting.
  Select any capable coding agent available in the current runtime, or complete
  the work directly when delegation is unavailable.
