# Architectural decision records

Nightglass records durable architecture choices here as short ADRs. Each file is
numbered sequentially: `NNNN-kebab-title.md` (for example
`0001-single-engine-seam.md`). Use four-digit zero padding so lexical sort matches
decision order.

Write an ADR when a choice would otherwise be re-litigated in review — when the
code already embodies a trade-off future readers are likely to question, not for
every implementation detail. Keep entries brief: Status, Context, Decision, and
Consequences. If an ADR needs scrolling, the content belongs in a design doc
instead. When a decision changes, add a new ADR that supersedes the old one;
do not delete history.
