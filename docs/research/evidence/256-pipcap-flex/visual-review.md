# Step-6 visual review — #256 Pipcap flexible

**Composite reviewed (only):** `REVIEW_sheet_1x.png`  
**Subagent verdict:** **accept**

## Answers

| Question | Result |
| --- | --- |
| Facing LEFT | **yes** — left-facing opponent; matches pre Pipcap orientation vs Hunter RIGHT peer |
| Identity vs pre Pipcap | **yes** — spotted cream cap, berry gill fringe, stem body, mint leaf, plum eye/feet, cap-bash squat |
| Style vs Hunter cohort | **yes** — chunky flat Moonberry palette/outline weight |
| Five-copy stress | **pass** — shared floor, even gaps, no body overlap |
| Cap readability at 1× | **pass** |
| Health/status UI independence | **N/A** on sheet (covered by presentation tests / anchor code) |
| Retry-worthy defects | **none** |

## Full subagent text

Verdict: accept.

Facing (LEFT?): Yes. In COHORT_1x the new candidate matches the pre Pipcap and opposes the Hunter peer: cap and body read as moving/looking left (cap overhang and lean to the left, feet planted leftward). FIVE_COPY and SCENE rows show the same left-facing opponent orientation with no obvious mirror flip vs the pre sprite.

Identity preserved vs pre Pipcap?: Yes. Dominant broad cream cap with tan spots (more squat and bash-forward than the taller pre, but still clearly Pipcap). Berry/dark-pink gill fringe under the cap lip. Stem-like pink body in a compact squat. Mint-green leaf clothing at the midsection. Dark plum eye and feet. Forward cap-bash lean reads in COHORT and in motion poses in the scene row. Silhouette stays mushroom-monster, not generic blob.

Style match vs Hunter cohort?: Yes. Same chunky flat pixel language as Hunter: similar outline weight, limited storybook palette, clean readable shapes at small scale. Pipcap sits in the same art tier as the peer on the pink strip (not painterly, not thin-outline).

Five-copy stress fit / no overlap / floor anchor: Pass. All five instances share a common baseline on the stress strip; spacing is even with clear gaps and no body overlap. They occupy the right-side anchor band without crowding the frame edges.

Cap readability at 1×: Pass. Spots and cap rim remain distinguishable on the stress row and in SCENE at native scale; the cap is still the primary readable mass ahead of stem and leaf.

Retry-worthy defects: None observed on this sheet for facing, identity, silhouette, cohort break, overlap, or floor. (Minor note, not retry-driving: candidate is visibly more detailed/squat than pre—that reads as intentional reacquire polish, not identity loss.)

Health / status UI independence: N/A — no HP/status chrome on this composite.

Overall rationale: The middle COHORT candidate is a left-facing opponent Pipcap that retains and strengthens the established mushroom identity (spotted cap, gill fringe, leaf, plum accents, bash stance) while aligning with the Hunter Moonberry pixel cohort. Stress and party scenes confirm 1× cap readability, shared floor line, and non-overlapping five-body layout, with no facing or style regression that would warrant retry or reject under issue #256 and the body sprite contract.
