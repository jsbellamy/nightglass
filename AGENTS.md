# Agent guide

## Agent skills

### Issue tracker

Issues are tracked as Local Markdown files under `.scratch/`. See
`docs/agents/issue-tracker.md`.

### Triage labels

The standard `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, and `wontfix` vocabulary is used. See
`docs/agents/triage-labels.md`.

### Domain docs

This is a single-context project with `CONTEXT.md` at the root and architectural
decisions under `docs/adr/`. See `docs/agents/domain.md`.

### Asset generation

Before creating or changing any raster asset, follow the acquisition loop in
`docs/agents/asset-generation.md`. It routes each asset class to its authoritative
contract and defines the evidence required before an asset task is complete.
