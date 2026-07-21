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
     raw plus provenance sidecar so the CI `assets` job proves a byte-identical
     rebuild. Use targeted acquisition and promotion checks locally; do not run
     the full-catalog `assets:verify` command for an ordinary asset issue.
     Archived raws, sidecars, and scratch files land at absolute paths inside
     the worktree; generated images arrive via the `GenerateImage` copy step in
     the constraints below.
5. Before publishing, make an **acceptance matrix** containing every checkbox
   from the live issue. Follow `docs/agents/acceptance-evidence.md`: for each
   row, state a disposition plus specific evidence at the seam the criterion
   names — citing `evidence:` / `manual-check:` scenario slugs where those
   apply, a code location, command result, or scenario-keyed review artifact.
   Never infer a rendered, contrast, cross-window, or native criterion from a
   happy-dom or unit test. Readability and review-sheet criteria need the
   sheet attached; byte-identity criteria name the CI `assets` job as their
   evidence source (pending until the branch is pushed).
   Apply that doc's three dispositions: unsupportable → stop (do not open a
   completion PR); agent-blocked native → open the PR and block merge until a
   human adds the row; successor-falsified → flag for editorial disposition,
   do not tick, do not stop.
6. Commit only the issue's changes. Let any commit hooks run; never bypass them.
7. Review your own work before publishing: run `/code-review` with `main` as the
   fixed point (`git diff main...HEAD`) and the live issue body as the Spec
   source, passing the acceptance matrix in so the Spec reviewer returns a
   per-criterion `met` / `unmet` / `needs manual` verdict with an evidence
   pointer per row. If the runtime does not expose `/code-review`, run the
   equivalent Standards and Spec reviews as parallel sub-agents. Rework every
   Spec finding, every `unmet` row, and every hard Standards violation (a
   documented repo-standard breach), then commit and re-run the review until
   those are clear. Judgement-call Standards smells need no rework — carry them
   into the verdict table for the merge decision.
8. Push with `git push -u origin <branch>`, then create a pull request whose
   body includes a summary, verification details, the complete acceptance
   matrix, and `Closes #<N>`. For an ordinary asset issue, use the PR's CI
   `assets` job as the authoritative full-catalog result instead of rerunning
   `assets:verify` locally. Pipeline, contract, palette, manifest-schema, and
   shared-derivation changes still require the local full verifier before push.
9. Post the review to the PR with `gh pr comment <N> --body-file <path>`: the
   **verbatim** Standards and Spec sub-agent output under separate headings,
   plus the reworked findings and the commits that resolved them. Paste what the
   reviewers wrote — never a summary of your own review, and never a report
   rewritten to read better than the one you received.
10. Report the PR URL, what was built, test results, and the review **verdict
    table** derived mechanically from that comment: one row per acceptance
    criterion with its `met` / `unmet` / `needs manual` verdict and evidence
    pointer, the count of blocking findings before and after rework, any
    unreworked judgement-call smells, the comment URL, and anything
    deliberately left out of scope. The full reports stay in the PR comment —
    the report you return is the table, not the reviews.

## Constraints

- This agent has no direct user-interaction channel. Never ask the user a
  question or wait for user approval. Resolve routine decisions from the issue
  and repository contracts. When progress is impossible, stop and return a
  structured blocked report to the calling orchestrator with the blocking
  condition, evidence, attempts made, and recommended next choice; the
  orchestrator owns any human interaction.
- The worktree root is the only writable tree. Use absolute paths under that
  root for every Write/StrReplace/edit — a relative path like
  `docs/research/...` resolves against the primary multi-root root, not your
  worktree. Set shell `cwd` to the worktree root. Never write under a sibling
  checkout (including SideScape) or the primary multi-root workspace root when
  it is not this worktree.
- Cursor `GenerateImage` may only emit a filename (it dumps outside the
  worktree). Immediately copy each dump into the worktree archive path with an
  absolute destination — step 3 of `docs/agents/asset-generation.md` owns which
  path that is — and work from the copy. Do not leave issue artifacts in the
  Cursor dump folder or any sibling repo. If you cannot copy into the worktree,
  stop and report — do not invent another destination.
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
