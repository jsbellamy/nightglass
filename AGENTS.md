# Agent guide

This is the source of truth for every agent working on Nightglass, regardless
of which tool or model is driving. Tool-specific files (for example
`CLAUDE.md`) layer on top of this document; put changes to shared guidance
here or in the docs it routes to, not in a tool-specific file.

## Agent skills

### Issue tracker

Issues are tracked as GitHub issues on `jsbellamy/nightglass`. See
`docs/agents/issue-tracker.md`.

### Triage labels

The standard `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, and `wontfix` vocabulary is used. See
`docs/agents/triage-labels.md`.

### Domain docs

This is a single-context project with `CONTEXT.md` at the root and architectural
decisions under `docs/adr/`. See `docs/agents/domain.md`.

### Code style and test seams

`docs/agents/code-style.md` is this repo's documented coding standard: the
layout and style rules for `src/core` / `src/data` / `src/ui`, and the
standing seam agreement for the `/tdd` (red-green) workflow. Engine changes
are test-first at its seams, and code review judges every diff against its
rules — a breach is a documented-standard violation, not a judgement call.

### Asset generation

Before creating or changing any raster asset, follow the acquisition loop in
`docs/agents/asset-generation.md`. It routes each asset class to its authoritative
contract and defines the evidence required before an asset task is complete.

## Git workflow

One branch per issue (`issue-<N>-<slug>`, based on `main`); never work
directly on `main`. Finish with a pull request that includes `Closes #<N>` and
an acceptance matrix: every issue checkbox as an evidence row citing a test,
code location, command result, or attached review sheet at the seam the
criterion names.

## Delegating work

These instructions are model-neutral: do not require a particular provider,
model, or effort setting to delegate work. A reusable issue-implementation
subagent is defined in `.agents/issue-implementer.md`; tool-specific runtimes
may provide their own pinned variant (for example
`.claude/agents/issue-implementer.md`) — prefer the variant native to the
runtime you are in. The orchestrator independently owns the acceptance gate:
before merging, re-read the live issue and verify every acceptance row at its
seam — green CI and a scope-matching file list are necessary but never
sufficient.
