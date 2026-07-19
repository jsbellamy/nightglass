# Nightglass — Claude Code

**`AGENTS.md` is the source of truth. Read it first.** This file only adds the
Claude-Code-specific layer; everything not restated here is governed by
`AGENTS.md`. When you change shared guidance (domain, architecture,
conventions, workflow), edit `AGENTS.md` or the docs it routes to, not this
file.

## Skills

- **`/tdd`** — invoke explicitly for every Engine change, then work test-first
  at the seams in `docs/agents/code-style.md` (that doc is the standing seam
  agreement, so the skill's seam question is already answered).

## Subagents

- Spawn implementation subagents as the **`issue-implementer`** agent type
  (`.claude/agents/issue-implementer.md`), pinned to **Sonnet at high effort**.
  Never override the model upward and never run it above high effort. It
  implements one GitHub issue end-to-end in an isolated worktree and opens a
  PR.
- The process lives in `.agents/issue-implementer.md`; the `.claude` variant
  contributes only the frontmatter pins and Claude-runtime notes.

## Toolchain notes

- If `gh` is not on `PATH`, it is at `/opt/homebrew/bin/gh`.
