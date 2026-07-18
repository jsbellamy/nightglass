# Domain Docs

How engineering skills should consume this project's domain documentation.

## Before exploring, read these

- `CONTEXT.md` at the project root
- Relevant decisions under `docs/adr/`

If a file or directory does not exist, proceed silently. Domain-modeling workflows create documentation lazily when terms or decisions are resolved.

## Layout

This is a single-context project:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use the glossary's vocabulary

Use terms as defined in `CONTEXT.md` in issues, proposals, tests, and code. Do not drift to synonyms the glossary explicitly avoids. A missing term may indicate either unsuitable language or a gap to resolve through domain modeling.

## Flag ADR conflicts

Surface any proposal that contradicts an existing ADR rather than silently overriding the earlier decision.
