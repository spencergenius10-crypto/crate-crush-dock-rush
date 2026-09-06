# Crate Crush: Dock Rush — Telemetry + Retention Model (v1)

**Owner:** Kade (analytics/opsec) → Chief  
**Studio:** Ratio Studios  
**Scope:** Defensive analytics only. No game code. Remy instruments prototype.

---

## 1. Event schema (D1 / D7 / D30)

### Identity & session keys (every event)
| Field | Type | Notes |
|---|---|---|
| `event_name` | string | snake_case below |
| `event_ts` | ISO-8601 UTC | client + server receive |
| `schema_ver` | string | `1.0` |
| `app_ver` | string | build/semver |
| `platform` | enum | `ios` \| `android` \| `editor` |
| `user_id` | string | anonymous install UUID (stable) |
| `session_id` | string | new each cold/warm start |
| `install_ts` | ISO-8601 | first open |
| `days_since_install` | int | floor((now−install)/86400) — drives D1/D7/D30 |
| `cohort_day` | date | install calendar day UTC |
| `country` | string | optional, privacy-safe |

### Core events

#### `session_start`
- Props: `session_id`, `cold_start` (bool), `push_enabled` (bool\|null), `att_status` (ios), `network` (wifi/cell/offline)
- Use: DAU, session count, D1/D7/D30 denominators

#### `session_end`
- Props: `session_duration_s`, `levels_attempted`, `levels_cleared`, `revives_used`, `rv_watched`, `iap_revenue_usd` (session sum)
- Use: session length, engagement depth

#### `dock_clear`
- Props: `level_id`, `attempt_n`, `duration_s`, `crates_smashed`, `sort_misses`, `stars` (0–3\|null), `difficulty_tier`, `is_first_clear` (bool)
- Use: clear rate, FTUE funnel, difficulty curve

#### `dock_fail`
- Props: `level_id`, `attempt_n`, `duration_s`, `fail_reason` (`timer`\|`lives`\|`quit`\|`other`), `crates_smashed`, `sort_misses`, `progress_pct` (0–100)
- Use: choke points, rage-quit vs soft fail

#### `smash`
- Props: `level_id`, `crate_type`, `combo` (int), `score_delta`, `x_lane` (optional)
- Use: core loop engagement (sample if volume high: 1/N)

#### `sort_miss`
- Props: `level_id`, `expected_bin`, `chosen_bin`, `streak_broken` (bool)
- Use: UX confusion / tutorial gaps

#### `revive`
- Props: `level_id`, `source` (`rv`\|`iap`\|`currency`\|`free_daily`), `attempt_n`, `progress_pct_at_revive`
- Use: monetization + soft-currency economy

#### `rv_watch`
- Props: `placement` (`revive`\|`double_reward`\|`skip_wait`\|`other`), `level_id`\|null, `completed` (bool), `ad_network`\|null, `ecpm_est`\|null
- Use: ad LTV, placement health — no invented CPMs in dash until live

#### `iap`
- Props: `sku`, `price_usd`, `currency_local`, `price_local`, `store` (`app_store`\|`play`), `level_id`\|null, `placement`, `validated` (bool)
- Use: payer %, ARPU — server-validate receipts

### Minimal identity events (prototype)
- `install` (once): `attribution` optional later
- `tutorial_step`: `step_id`, `completed` (bool)

---

## 2. Retention markers + dash sketch

### Definitions
| Metric | Definition |
|---|---|
| **D1 / D7 / D30** | Users with `session_start` on day N after install ÷ installs (cohort_day) |
| **D1 engaged** | D1 returners with ≥1 `dock_clear` OR ≥3 `smash` |
| **FTUE clear** | First `dock_clear` within first session |
| **Fail→revive** | `revive` within 60s of `dock_fail` same `level_id` |
| **RV attach** | Sessions with ≥1 completed `rv_watch` ÷ sessions |
| **Payer** | Users with ≥1 validated `iap` |

### Dash sketch (one screen)
1. **Cohort strip:** D1 / D7 / D30 bars by install week  
2. **Funnel:** install → session_start → tutorial_step complete → first smash → first dock_clear → D1 return  
3. **Level heat:** clear% and fail_reason mix by `level_id` (top fail levels)  
4. **Economy:** revive by source; RV completion by placement; IAP by sku (zeros OK early)  
5. **Health:** event volume / error rate / `% missing session_id` (quality gate)

### Alert thresholds (prototype — tune later)
- D1 &lt; 25% or drop &gt; 20% WoW → flag Chief  
- Level clear% &lt; 40% on early levels (1–5) → flag Remy difficulty  
- `schema_ver` mismatch or &gt;5% events missing `user_id`/`session_id` → stop trusting dash

---

## 3. Remy — first prototype instrument list (must-ship)

**Ship these before any balance polish:**
1. `install` + `session_start` / `session_end` with stable `user_id` + `session_id`
2. `dock_clear` + `dock_fail` (with `fail_reason`, `level_id`, `attempt_n`)
3. `smash` (or sampled) + `sort_miss`
4. `revive` with `source`
5. `rv_watch` with `placement` + `completed`
6. `iap` stub even if no store yet (`validated=false` in editor)
7. `tutorial_step` for first-dock FTUE only

**Do not build yet:** full BI warehouse, A/B framework, complex attribution, live ops calendars.

**Acceptance:** one play session produces a JSONL/log (or analytics SDK debug) containing at least one of each must-ship event with required fields populated.

