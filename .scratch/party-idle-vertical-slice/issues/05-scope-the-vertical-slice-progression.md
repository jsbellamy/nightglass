# Scope the vertical-slice progression

Type: grilling
Status: resolved
Blocked by: none

## Question

What amount and shape of Stage, Wave, Boss, Level, Talent Point, Character XP, and replay progression is the smallest vertical slice that proves the idle loop without pre-building the full game?

## Answer

The vertical slice contains three Stages. Each Stage has two ordinary Waves followed by a Boss. This is the smallest structure that demonstrates between-Wave persistence, Boss escalation, forward unlocking, Retry versus Retreat, and a repeatable farming frontier.

Characters begin at Level 1 and have a hard vertical-slice cap of Level 6. Every Level, including Level 1, grants one Talent Point. The first Talent Tier has a Stat Row containing two five-rank Stat Talents but accepting five total points distributed freely between them. Spending those five points unlocks an Ability Row in which the sixth point selects one of two mutually exclusive Ability Talents. Respec is free, manual, and point-by-point. Baseline Class actions and first-tier choices belong to the Class-kit specification.

Character XP uses these initial cumulative thresholds:

| Level | Cumulative Character XP |
|---|---:|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 450 |
| 5 | 650 |
| 6 | 850 |

The initial encounter XP budgets are:

| Stage | Wave 1 | Wave 2 | Boss | Stage total |
|---|---:|---:|---:|---:|
| 1 | 20 | 20 | 60 | 100 |
| 2 | 30 | 30 | 90 | 150 |
| 3 | 40 | 40 | 120 | 200 |

Each encounter's budget is allocated among its opponents in content data and awarded as those opponents are defeated; there is no hidden encounter-completion or first-clear XP bonus. Earned Character XP persists if the Stage Attempt is abandoned or ends in Party Defeat. Party Members receive the full award and the Reserve receives 50%. On a clean first-clear path, Party Members reach Level 2 after Stage 1, Level 3 after Stage 2, and Level 4 after Stage 3. Two further Stage 3 clears reach Levels 5 and 6. Partial failed attempts can accelerate those milestones slightly. Initial combat tuning should make this complete arc take roughly 20–30 minutes of visible play, including a few failures.

Clearing Stage 1 or Stage 2 unlocks and automatically begins the next Stage. Clearing Stage 3 automatically begins another Stage 3 Attempt. The player may manually select any unlocked Stage; doing so abandons the current Stage Attempt without revoking already-earned Character XP. At Level 6, repeated combat continues to matter through Equipment Drops rather than further Character XP.

The slice has no prestige or rebirth, account Level, Stage ratings, quests, daily rewards, alternate difficulty tiers, or other meta-progression. Its persistent progression is limited to unlocked Stages, Character XP and Levels, Talent Tree allocations and unlocked Ability Talents, and Equipment Drops and loadouts.
