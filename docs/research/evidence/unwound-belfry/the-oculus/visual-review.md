# Visual review — `the-oculus` (#579)

Composite reviewed (Step 6, subagent only):
[`tile-review-the-oculus.png`](./tile-review-the-oculus.png)
(native 480×112 Battle Tile stress case). `@4x` sheet:
[`tile-review-the-oculus@4x.png`](./tile-review-the-oculus@4x.png).

## Candidate table

| Candidate | Asset class | Raw gates | Clipped sides | Measurement | Primary result | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| c1 | backdrop | pass (PNG, 0 magenta, reduce 1536×1024→480×86) | n/a (scenery) | runtime max_lum ~198; near-white star/glow peaks | contrast — peaks compete with combat UI | retry |
| c2 | backdrop | pass (same reduce gates) | n/a | runtime max_lum ~180.5; mean ~9.2; 0 magenta | pass | accept |

Rejected c1 is durable as a table row. Scratch retains c1 as the hashed identity
direct input for c2 (`scratch/the-oculus-c1.png`).

## Step-6 verdict (candidate c2)

**accept**

Overall: The battlefield band reads as an open astronomical crown over a
moonless indigo void with tarnished brass armillary framing, while combatants,
UI, and effect samples stay clearly dominant over a quiet opponent half.

1. **Identity — Pass.** Upper void, faint pinprick stars, brass telescope, and
   verdigris armillary rings read as an open observatory crown under broken
   firmament, not a hall, court, gearworks chamber, field, or diner.
2. **Materials / lighting — Pass.** Tarnished brass, verdigris rings, cold faint
   stars, ivory rim glow, one dim alarm-red lamp, and moonless indigo void match
   Unwound Belfry cold-cosmic lighting; no Moonberry garden or Fowl dusk cast.
3. **Ground band — Pass.** Bottom fifth is a nearly flat dark stone parapet/floor
   with solid footing for the wide Boss silhouette.
4. **Combat-subordinate (I7) — Pass.** Party, Pipcaps, Boss, 2px health bars,
   yellow damage numerals, and luminous effect frames are the strongest signals;
   backdrop behind bars stays dark and low-contrast; no dim star reads as a
   hidden combatant.
5. **Forbidden content (I6/C3) — Pass.** No creature/body, readable text/logos/UI
   in the backdrop band, hot-magenta field, or bright starburst/fire/gore.
6. **Opponent-half clearing — Pass.** Boss/opponent half is especially dark and
   low-detail, keeping the wide Boss silhouette distinct.
7. **Capstone distinctness — Pass.** Open sky, astronomical framing, and cold
   cosmic void read as the coldest, most cosmic Belfry capstone rather than an
   interior or tower-foot scene.

| Feedback element | Verdict | Note |
| --- | --- | --- |
| Health bars (2px) | pass | Thin green bars read clearly above every combatant without backdrop competition. |
| Damage numbers | pass | Yellow “8” and “24” pop cleanly over the dark void and parapet. |
| Ability effect frames | pass | Teal arc-slash and pink spell-bloom samples are visible and legible. |
| Status / actor-pool chips | pass | Status strip chips and HP readout do not clutter the battlefield band. |
| Ground contact | pass | All combatants sit believably on the dark stone parapet. |
