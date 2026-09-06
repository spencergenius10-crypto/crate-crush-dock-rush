# Crate Crush: Dock Rush — Economy Spreadsheet v1
**Owner:** Remy · **Aligns to:** Systems Sheet v1.4 · **Date:** 2026-09-06  
**Rules:** No gem gates on power. BP = cosmetics + soft currency only. Hard (Gems) = cosmetics + convenience.

---

## 1) Currencies

| ID | Type | Earn | Sink | Power? |
|---|---|---|---|---|
| `coins` | Soft | Dock clear, sort streak bonus, contracts, idle claim | Smash / lanes / sort-speed upgrades, talent nodes, revive (alt to RV) | Yes (progression) |
| `shards` | Soft (collection) | Perfect clear rare drop, stretch contracts, BP track | Cargo Book pages / prestige cosmetics | **No** |
| `gems` | Hard | Milestones, BP premium track, sparse D1/D7 gift | Cosmetic packs, consumable bundles, BP unlock | **No** |

---

## 2) Expected coins / dock (active play)

Assumes target clear time ~25–35s; streak bonus = +5% per clean sort streak step, capped +25%.

| Dock band | `level_id` range | Base coins/clear | Streak avg (+%) | Expected coins/dock | Notes |
|---|---|---|---|---|---|
| Early FTUE | D01–D05 | 120 | +10% | **132** | Teach smash→sort→truck; Filter Glove free at D03 |
| Early climb | D06–D12 | 140 | +12% | **157** | 2→3 cargo types |
| Early-mid | D13–D20 | 155 | +12% | **174** | Timer pressure starts |
| Mid | D21–D35 | 170 | +15% | **196** | 3→4 types; rare shard chance on perfect |
| Mid-deep | D36–D50 | 185 | +15% | **213** | Soft prestige tease (Warehouse Tier 2 at ~D45) |

**Session model (D1 target):** 8–12 docks → ~1,100–1,600 coins/session before upgrades sinks.  
**Idle:** 25% of active coins/min equivalent, hard cap 3h → claim or RV 2× (systems ad map).

### Fail / revive economy
| Event | Coin impact |
|---|---|
| `dock_fail` (timer) | 0 coins; progress_pct discarded |
| Revive via RV | Continue; full clear pays normal |
| Revive via coins | Cost = `0.35 × expected_coins_for_level` (round to 10) |
| Revive via gem consumable | From bundle only — never required |

---

## 3) Upgrade costs (soft — coins)

### 3a Smash Power (`upg_smash`)
| Level | Cost (coins) | Cumulative | Effect (design intent) |
|---|---|---|---|
| 1→2 | 200 | 200 | Faster smash resolve |
| 2→3 | 350 | 550 | |
| 3→4 | 550 | 1,100 | |
| 4→5 | 800 | 1,900 | Mid unlock feel |
| 5→6 | 1,200 | 3,100 | |
| 6→7 | 1,700 | 4,800 | |
| 7→8 | 2,400 | 7,200 | |
| 8→9 | 3,200 | 10,400 | |
| 9→10 | 4,200 | 14,600 | Soft cap early game |

**Affordability:** Level 5 reachable ~session 2–3 from play alone (no gems).

### 3b Lane slots (`upg_lanes`) — start with 2 lanes
| Slots | Cost (coins) | Cumulative from 2 |
|---|---|---|
| 2→3 | 500 | 500 |
| 3→4 | 1,500 | 2,000 |
| 4→5 | 4,000 | 6,000 |

Lane 3 ≈ after D08–D10 play. Lane 5 = mid sink, not FTUE.

### 3c Sort speed (`upg_sort`)
| Level | Cost (coins) | Cumulative |
|---|---|---|
| 1→2 | 180 | 180 |
| 2→3 | 300 | 480 |
| 3→4 | 480 | 960 |
| 4→5 | 750 | 1,710 |
| 5→6 | 1,100 | 2,810 |
| 6→7 | 1,600 | 4,410 |
| 7→8 | 2,300 | 6,710 |

### 3d Talent nodes (Dock Skills — coins only)
| Node | Cost | Unlock gate | Power? |
|---|---|---|---|
| Filter Glove | **0** (FTUE) | First clear D03 | Skill express |
| Bounce Dampen | 900 | Smash Lv3 | QoL / control |
| Spill Magnet | 1,800 | Lanes ≥3 | Soft-fail assist |
| Streak Shield (1 miss/dock) | 2,500 | Sort Lv4 | Skill, not P2W wall |
| Idle Cap +1h | 1,200 | Warehouse Tier 1 | Convenience (soft) |

**No talent requires gems.**

---

## 4) Soft vs hard sinks (summary)

| Sink | Coins | Shards | Gems |
|---|---|---|---|
| Smash / lanes / sort upgrades | ✓ | — | — |
| Talent nodes | ✓ | — | — |
| Revive (alt to RV) | ✓ | — | optional consumable |
| Cargo Book page unlock | — | ✓ | — |
| Crate / lane / forklift skins | — | ✓ or ✓gems | ✓ cosmetic packs |
| BP Premium unlock | — | — | ✓ ($ track or gem unlock) |
| Smash Boost / Filter Token consumables | ✓ small or ✓gems bundle | — | ✓ convenience |
| **Power gates** | soft only | never | **never** |

---

## 5) Battle Pass (cosmetics-only power)

| Tier | Price | Player gets | Explicitly excluded |
|---|---|---|---|
| Free track | $0 | Coins, shards, 1–2 common skins | — |
| Cargo Pass | $2.99 | Full cosmetic track + soft currency | Smash power, lane slots, talent ranks |
| Premium Pass | $4.99 | Cargo Pass + exclusive forklift skin + 3 revive consumables | Same power ban |
| Starter Kit | $0.99 | Cosmetic smash FX + 1× 2× haul token | Permanent power |

Paid track may grant **coins/shards/cosmetics/consumables** — never `upg_smash` / `upg_lanes` / `upg_sort` levels.

---

## 6) Early/mid coin flow check (sanity)

| Milestone | Coins in (approx) | Major sinks due | Net feel |
|---|---|---|---|
| End D05 | ~650–800 | Smash 2–3, Sort 2 | Comfortable |
| End D12 | ~1,800–2,200 | Lane 3, Smash 4, Bounce Dampen | Choices, not blocked |
| End D20 | ~3,200–3,800 | Sort 5, Smash 5–6 | Mid sinks bite — RV 2× optional-want |
| End D35 | ~6,000–7,500 | Lane 4, Spill Magnet, Smash 7 | Prestige/collection pull |

If early clear% &lt;40% (Kade alert) → Remy cuts timer or costs 10–15%, not gem crutches.

---

## 7) CSV-ready columns (import)

`band,level_id_start,level_id_end,base_coins,expected_coins,upg_smash_to5_cum,upg_lanes_to3,upg_sort_to4_cum`  
`early,1,5,120,132,1100,500,960`  
`early_climb,6,12,140,157,1100,500,960`  
`early_mid,13,20,155,174,1900,500,1710`  
`mid,21,35,170,196,3100,2000,2810`  
`mid_deep,36,50,185,213,4800,2000,4410`

