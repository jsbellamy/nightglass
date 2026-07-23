# Party-Based Idle Game

An idle combat game about composing a small party from a fixed roster of distinct fantasy classes.

## Language

**Class**:
One of the four combat identities available at launch: Knight, Wizard, Priest, or Hunter. Each Class is represented by exactly one Character in the Roster and has a fixed canonical combat appearance.
_Avoid_: job, role, archetype

**Class Kit**:
The fixed combat design belonging to a Class: its Basic Attack, Core Abilities, and Talent Tiers. In the vertical slice, every Class Kit has one Basic Attack, four Core Abilities, and one Talent Tier.
_Avoid_: move set, skill set

**Core Ability**:
One of the four Abilities available to a Character without spending a Talent Point. Core Abilities compete with unlocked Ability Talents for the Character's three Ability Loadout slots.
_Avoid_: starting skill, base ability

**Character**:
A persistent combatant belonging to the player's Roster and defined by one Class.
_Avoid_: hero, unit

**Roster**:
The player's four owned Characters, consisting of one Knight, Wizard, Priest, and Hunter.
_Avoid_: collection, character pool

**Party**:
The three Characters selected from the Roster to participate in combat together.
_Avoid_: team, squad, formation

**Formation**:
The Party's ordered Front, Middle, and Back positions. Ordinary opponent attacks target the closest living Party Member.
_Avoid_: party order, lineup

**Battlefield**:
The fixed side-on combat scene where the Party faces right and Opponents face left. Characters may move within it for attacks but do not use multi-directional exploration movement.
_Avoid_: map, arena, board

**Visual Theme**:
The authored visual vocabulary shared by a family of battlefield assets, including pigment palette, silhouette and material rules, environmental lighting, and tone. A Visual Theme is independent of Stage progression and does not by itself make content playable.
_Avoid_: world or biome when referring only to art direction

**Opponent**:
A combatant fought by the Party on the Battlefield, defined by authored statistics and Abilities. Opponents are not Characters on the Roster.
_Avoid_: enemy, mob, monster

**Battle Tile**:
The fixed 480×112 logical-pixel, always-on-top surface that contains the live Battlefield. The Management Dock fans out beside it but does not resize, replace, or implicitly pause it. The dock may translate the tile horizontally only to keep it centered on the clamped dock workspace.
_Avoid_: main window, taskbar, combat window

**Management Dock**:
The single 800×480 logical-pixel tabbed panel, docked flush above the tile (below it when top-parked). It shows one management surface at a time — Armory, Character, or Stage — and opening or switching it never resizes or implicitly pauses the Battle Tile. It may translate the tile horizontally only to preserve center-on-dock after monitor clamping.
_Avoid_: management windows, card fan, settings panel

**Party Member**:
A Character while selected into the active Party. The fourth Character remains in the Roster but does not participate in combat.
_Avoid_: active character, deployed character

**Reserve**:
The one Roster Character not selected into the Party. The Reserve does not participate in combat and receives half the Character XP earned by Party Members.
_Avoid_: bench, inactive character

**Character XP**:
Progress earned by a Character toward increasing that Character's Level. Party Members receive the normal award while the Reserve receives a reduced share.
_Avoid_: experience points, class XP

**Level**:
A Character's persistent progression rank, increased through Character XP.
_Avoid_: character level, base level, job level

**Talent Point**:
A persistent allocation unit granted at each Level, including Level 1, and spent within that Character's Talent Tree. The player reallocates Talent Points manually, one point at a time, with prerequisite dependencies enforced.
_Avoid_: skill point, stat point

**Stat Talent**:
A rankable Talent Tree choice that incrementally modifies a Character's combat statistics. Points spent across a Stat Row contribute toward unlocking its following Ability Row.
_Avoid_: passive, stat node

**Ability Talent**:
A single-rank Talent Tree choice that unlocks an Ability for use in that Character's Ability Loadout.
_Avoid_: skill unlock, ability node

**Talent Tier**:
A six-point section of a Talent Tree consisting of one Stat Row and its following Ability Row. The vertical slice contains one Talent Tier; later progression repeats the cadence every six Talent Points.
_Avoid_: talent branch, specialization

**Stat Row**:
The first row of a Talent Tier. It contains two five-rank Stat Talents but accepts at most five total Talent Points, which may be distributed freely between them.
_Avoid_: stat tier, passive row

**Ability Row**:
The second row of a Talent Tier. It unlocks after five total Talent Points are spent in the preceding Stat Row and accepts one Talent Point in either of its two mutually exclusive Ability Talents.
_Avoid_: capstone row, ability tier

**Equipment**:
A combat Drop that can be worn by a Character to increase or alter that Character's power without changing the Character's combat appearance.
_Avoid_: gear (as the general term), item (when specifically referring to worn power)

**Drop**:
The awarded instance of Equipment that enters the Armory after combat, identified by a unique drop identifier and carrying rolled Rarity, Affixes, and Item Level. Distinguished from **Equipment Base** (the authored template) and **Equipment** (the wearable category).
_Avoid_: loot roll, item instance

**Equipment Base**:
The authored identity of an Equipment piece within one Equipment Tier, supplying its Equipment Slot, icon, name stem, Class restriction if any, and guaranteed base statistic.
_Avoid_: base item, item type

**Item Level**:
A source rank equal to the Stage that produced an Equipment piece in the vertical slice: 1, 2, or 3. Item Level determines Equipment Tier but does not independently change statistics within a Tier.
_Avoid_: equipment level, required level

**Equipment Tier**:
An authored Equipment milestone spanning an Item Level band and providing a distinct family of Equipment Bases and Affix ranges. The vertical slice uses Tier I for Item Levels 1-2 and Tier II for Item Level 3.
_Avoid_: rarity, item tier

**Rarity**:
An Equipment piece's quality tier, determining how many randomized Affixes it carries in addition to its Equipment Base.
_Avoid_: quality, grade, equipment tier

**Affix**:
A randomized statistic bonus rolled on an Equipment Drop. Affixes are separate from the guaranteed statistic supplied by its Equipment Base.
_Avoid_: property, perk, modifier

**Equipment Slot**:
One named position in a Character's Equipment Loadout. The vertical slice uses Weapon, Armor, and Charm; the full game is expected to expand to six slots.
_Avoid_: gear slot, inventory slot

**Equipment Loadout**:
The Equipment currently worn by a Character, with at most one piece in each Equipment Slot. It does not change the Character's fixed combat appearance.
_Avoid_: gear set, equipment set

**Armory**:
The shared, capacity-free collection of all Equipment owned by the Roster. Equipped pieces remain in the Armory and carry an exclusive Character-and-slot assignment.
_Avoid_: inventory, stash, bag

**Locked Equipment**:
Equipment manually protected from disposal. Equipment currently assigned to a Character is also protected even when not Locked.
_Avoid_: favorite, pinned item

**Unseen Equipment**:
Newly awarded Equipment the player has not yet opened in the Armory. It remains fully owned and usable; opening it clears the marker.
_Avoid_: unclaimed item, unread drop

**Weapon**:
A Class-specific Equipment piece occupying the Weapon slot: Knight blade, Wizard focus, Priest relic, or Hunter bow.
_Avoid_: main hand, class item

**Armor Equipment**:
A Class-unrestricted Equipment piece occupying the Armor slot. This term distinguishes the wearable piece from the Armor combat statistic.
_Avoid_: chest (until the full six-slot layout is defined)

**Charm**:
A Class-unrestricted Equipment piece occupying the Charm slot.
_Avoid_: accessory, trinket

**Automatic Combat**:
Combat in which Party Members choose and perform their configured actions without moment-to-moment player input.
_Avoid_: auto-play, auto-battle

**Action Cycle**:
One combatant's independent sequence of choosing an action, completing its Wind-up, applying its Impact, and completing its Recovery before choosing again.
_Avoid_: turn, global cooldown

**Wind-up**:
The pre-Impact portion of an Action Cycle during which the chosen action is visibly prepared but has not yet applied its effects.
_Avoid_: cast time (as the general term)

**Impact**:
The instant within an Action Cycle when its damage, healing, Buffs, or other combat effects are applied and its cooldown begins.
_Avoid_: hit (as the general term)

**Recovery**:
The post-Impact portion of an Action Cycle that must finish before the combatant chooses another action.
_Avoid_: backswing, end lag

**Cooldown**:
The time after an Ability's Impact before that Ability can be chosen again.
_Avoid_: recharge

**Damage Channel**:
Whether an Ability effect applies **Physical Damage** or **Elemental Damage**. Distinct from **Element**, which names a specific elemental identity within Elemental Damage.
_Avoid_: damage type (as the general term)

**Physical Damage**:
Damage reduced by the target's Armor.
_Avoid_: weapon damage (as the general term)

**Physical Power**:
A derived statistic used to calculate an Ability's raw Physical Damage: `floor((base Physical + flat bonuses) × (1 + summed percentage bonuses))`. The dedicated **Character → Stats** surface exposes the consolidated Physical Power total with Base, Equipment, and Talent breakdowns. Ability and Talent tiles elsewhere show per-Ability results and generated mechanical text in a hover/focus popover rather than inline consolidated totals.
_Avoid_: attack, weapon power

**Armor**:
A combat statistic that reduces incoming Physical Damage.
_Avoid_: physical resistance, defense

**Elemental Damage**:
Damage carrying an Element identity and reduced by the target's Elemental Resistance. The vertical slice uses one shared resistance value across all Elements.
_Avoid_: magic damage, spell damage (as general terms)

**Elemental Power**:
A derived statistic used to calculate an Ability's raw Elemental Damage and Healing: `floor((base Elemental + flat bonuses) × (1 + summed percentage bonuses))`. The dedicated **Character → Stats** surface exposes the consolidated Elemental Power total with Base, Equipment, and Talent breakdowns. Ability and Talent tiles elsewhere show per-Ability results and generated mechanical text in a hover/focus popover rather than inline consolidated totals.
_Avoid_: magic power, spell power

**Elemental Resistance**:
A combat statistic that reduces incoming Elemental Damage regardless of its Element in the vertical slice. It may later become separate resistance values for individual Elements.
_Avoid_: ward, magic defense

**Element**:
The identity carried by Elemental Damage for future element-specific interactions. In the vertical slice, every Element is reduced by the same Elemental Resistance statistic.
_Avoid_: using "damage channel" to mean an Element; damage type (as the general term)

**Healing**:
Restoration of lost health up to a Character's maximum health. Its raw amount is calculated from the user's Elemental Power and the Ability's Healing coefficient. Excess Healing has no effect unless an Ability explicitly defines another outcome.
_Avoid_: recovery (which names an Action Cycle phase)

**Status Effect**:
A named, time-limited combat effect applied at Impact. Reapplication refreshes the same effect rather than stacking another copy of it.
_Avoid_: condition, modifier (as the general term)

**Buff**:
A beneficial Status Effect.
_Avoid_: boon

**Debuff**:
A harmful Status Effect.
_Avoid_: ailment (as the general term)

**Stun**:
A Debuff that cancels an unfinished Wind-up and prevents the affected combatant from beginning another Action Cycle for its duration.
_Avoid_: stagger, interrupt

**Pending Edit**:
A player configuration change — Formation, Ability Loadout, Talent allocation, or Equipment — recorded during a Stage Attempt and applied at the next Wave or Boss boundary. Until applied, the Pending Edit shapes what the interface shows without changing combat.
_Avoid_: queued change, staged edit, dirty state

**Talent Tree**:
A per-Character set of progression choices that shapes how that Character fights. Allocated choices can be manually decremented and reassigned one point at a time; edits made during combat apply at the next Wave or Boss boundary.
_Avoid_: skill tree, passive tree

**Ability**:
An action a Character can perform during Automatic Combat, such as a spell, weapon technique, heal, buff, or defensive action.
_Avoid_: spell (as the general term), skill

**Basic Attack**:
The always-available Ability defined by a Class Kit, chosen during Automatic Combat when no configured Ability in the Ability Loadout qualifies. It is not one of the three Ability Loadout slots and does not compete for them.
_Avoid_: auto-attack, default skill

**Ability Loadout**:
An ordered selection of unlocked Abilities configured for one Character. During Automatic Combat, the Character chooses the first configured Ability whose cooldown and targeting conditions permit it, falling back to the Basic Attack when none qualify.
_Avoid_: spell loadout, action bar, skill loadout

**Activation Delay**:
The period after an Ability is newly inserted into an Ability Loadout during a Stage Attempt before that Ability can be chosen. Its duration equals the Ability's full cooldown.
_Avoid_: equip cooldown, swap penalty

**Stage**:
A repeatable combat destination made of an ordered sequence of Waves ending in a Boss. Clearing a Stage unlocks the next Stage.
_Avoid_: level, area, zone

**Stage Attempt**:
One run through a Stage. The Party begins fully restored, while damage and Knockouts persist between its Waves until the Stage is cleared or ends in Party Defeat.
_Avoid_: run, battle

**Wave**:
One group of Opponents fought within a Stage; defeating it advances the Party to the next Wave or the Boss.
_Avoid_: round, encounter

**Encounter**:
The ordinal position within a Stage Attempt at which combat occurs: 1, 2, or 3. Encounters 1 and 2 are Waves; Encounter 3 is the Boss.
_Avoid_: wave number (when the Boss is meant)

**Boss**:
The final opponent or opponent group in a Stage whose defeat clears that Stage.
_Avoid_: final boss

**Failure Policy**:
The intended player's choice for handling a failed Stage Attempt: Retry repeats that Stage, while Retreat moves back one Stage and may continue stepping down after further failures.
_Avoid_: death mode, retry setting
_Vertical slice:_ not implemented — Retry and Retreat are explained through Stage selection and automatic retry behavior rather than a persistent policy setting.

**Party Defeat**:
The failure condition that ends the current Stage attempt, occurring when every Party Member is Knocked Out.
_Avoid_: death, wipe

**Knockout**:
The state of a Character at zero health. A Knocked Out Party Member stops acting but may be revived by an Ability while the remaining Party Members continue fighting.
_Avoid_: death, defeat

**Offline Progress**:
Capped advancement calculated when the application reopens after being closed. It summarizes progression and Drops, then begins a fresh visible Stage Attempt.
_Avoid_: idle gains, background combat

**Content**:
The aggregate authored data supplied to the Simulation Engine: Class Kits, Abilities, Opponents, Stages, Equipment Bases, Affix bands, and related definitions. It is validated before use and treated as immutable for the lifetime of an Engine instance.
_Avoid_: game data, content pack

**Simulation Engine**:
The headless, caller-advanced module that owns deterministic combat and progression rules. It accepts player commands, advances from injected time and RNG sources, and exposes Snapshots plus Presentation Events without depending on timers, the DOM, Tauri, audio, or animation assets.
_Avoid_: game loop (when referring to the module), backend

**Snapshot**:
A versioned, serializable view of all persistent Simulation Engine state needed for saving, reloading, Offline Progress, and deterministic continuation. Derived interface-only state does not belong in it.
_Avoid_: save file (which is the encoded storage artifact), state dump

**Presentation Event**:
A discrete, timestamped fact emitted by the Simulation Engine for audiovisual projection, such as an Action beginning, an Impact occurring, a Drop being awarded, or a Wave ending. It reports what happened but does not name sprite files, effects, or DOM elements.
_Avoid_: animation event (too asset-specific), UI event

**Archived Raw Bundle**:
The acquisition boundary for generated art: each external provider PNG is stored byte-for-byte beside a provenance sidecar containing its exact prompt and SHA-256. Builds consume this bundle offline; a provider, model, GPU, or network is never present at build or runtime.
_Avoid_: source art (too broad), generated assets (does not name the reproducibility boundary)

**Logical-Grid Recovery**:
The deterministic acquisition step that detects the large-rendered logical-pixel pitch in an Archived Raw Bundle PNG and majority-votes each cell into a native-scale Character frame without resizing the raw image.
_Avoid_: downscaling, resizing, pixelation
