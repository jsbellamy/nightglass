# Character Variant C visual reference

These 800×480 captures are the durable visual authority for the Character
workspace correction wave:

- [`build.jpg`](build.jpg) — final recovered Variant C Build composition
- [`stats.jpg`](stats.jpg) — final recovered Variant C Stats composition

They were recovered from the deleted
`src/ui/character-surface.prototype.ts` prototype history. They are
reference-only interface evidence, not runtime assets or pixel-exact golden
screenshots.

## Asset contract

- Asset class: interface reference
- Status: reference-only
- Runtime destination: none; cited by Character UI issues and review
- Runtime shape: JPEG, 800×480, opaque
- Visual vocabulary: recovered final Variant C using existing Nightglass Dock
  styling
- Geometry: full fixed-size Management Dock composition
- Review context: native 800×480 Character Build and Stats views
- Validator: file format/dimensions plus the SHA-256 identities below

## How to read the Build reference

Preserve:

- the current 150px Character rail, Formation arrows, and reserve swap;
- the compact selected-Character header with Build/Stats controls at right;
- explicit Loadout and Talents headings;
- the narrow Loadout column and wider Talents column;
- Loadout visual and DOM order: Basic Attack, Slots I–III, Available skills;
- an icon-only Available tray with four complete choices visible and horizontal
  scrolling when the fixture contains ten;
- compact Talent rows and attached `− | rank/max | +` steppers;
- no outer Character scroll at 800×480.

The floating prototype variant switcher is prototype-only and must not ship.
Production behavior, accessibility, pending edits, popovers, drag/drop, and
select-then-slot semantics remain authoritative where the static capture cannot
express them.

## How to read the Stats reference

Preserve the compact overview and grouped-card composition, but map it only to
canonical data:

- Vitals: Max Health
- Offense: Physical Power and Elemental Power
- Defense: Armor and Elemental Resistance

The Character header alone owns Level and available Talent Points. Stats may
show exact XP progress or Max Level, but must not duplicate Level/Talent Points
or introduce the prototype's illustrative crit, speed, utility, threat,
mitigation, cooldown, or temporary combat telemetry.

## Evidence identity

| Capture | Format | Dimensions | SHA-256 |
| --- | --- | --- | --- |
| `build.jpg` | JPEG | 800×480 | `2d890b684ce297978c1fd49cc3ef35f6ad437f36234a9f4963c065d62f0aeb26` |
| `stats.jpg` | JPEG | 800×480 | `58b4856200e098a5847752b2122c49a0408ff24995b1ed28583b033b07083131` |
