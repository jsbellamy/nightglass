# Issue tracker: Local Markdown

Issues and PRDs for this project live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file
- Comments and conversation history append under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/`, creating the directory if needed.

## When a skill says "fetch the relevant ticket"

Read the referenced file. The user will normally pass its path or issue number.

## Wayfinding operations

- **Map**: `.scratch/<effort>/map.md` holds Destination, Notes, Decisions so far, Not yet specified, and Out of scope.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, holds one question. A `Type:` line records `research`, `prototype`, `grilling`, or `task`; a `Status:` line records `open`, `claimed`, or `resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every listed file is `resolved`.
- **Frontier**: scan the effort's `issues/` directory for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before doing any work.
- **Resolve**: append the answer under `## Answer`, set `Status: resolved`, then append a gist and relative link to the map's Decisions-so-far section.
