# Headroom: Garmin Personal API source (PRD)

Status: phases 1 to 3 are built and in v0.17.0 (15 November 2026). Phase 4, the on-device check against Garmin Connect, is still to do.

What the captured responses showed, against the risks listed below:

- VO2 max and HRV both come through. Neither is stripped.
- Sleep comes as total minutes per stage, with no timeline of when each stage happened. The sleep score only needs totals, so it is unaffected.
- Garmin does not report when a key expires. The token only carries its own one-day expiry, so the key's expiry date is typed in with the key.
- A wrong key and a wrong token both get HTTP 401 with an empty body.
- Weight takes a one-year range in a single request.

## Problem

Headroom gets Garmin data only through the phone's health store (Health Connect on Android, Apple Health on iOS). That has three gaps:

- **VO2 max never arrives** on Android, so it has to be typed in by hand (see `src/sources/phoneHealth.ts`).
- **HRV and sleep depend on what Garmin chooses to write** into the health store, and on that phone sync having run.
- **Swim and bike detail** for the 70.3 plan is thin.

Garmin's new Personal API lets you read your own Garmin Connect data with a key you create yourself. No approval, no password, no Docker.

## Goal

Add a third data source, **Garmin (direct)**, next to the phone health store and demo data. It reads straight from Garmin Connect and feeds the same sync, sleep score, readiness and load code that already exists.

## Success criteria

1. In Settings you paste the key once. It's stored in the device's secure storage and never written to SQLite, backups, logs or git.
2. "Sync now" pulls activities, sleep, resting HR, HRV, steps, VO2 max and weight for the usual window. "Re-read everything" backfills history.
3. VO2 max shows up on the VO2 screen without manual entry.
4. Swims, rides, runs, strength and tennis map to the right `ActivityType`.
5. Switching between Garmin (direct) and the phone store doesn't create duplicate activities. The existing dedupe handles it, and tests prove it.
6. When the key has expired or been revoked, the app shows a clear message saying so, not a generic error. It also warns 14 days before the key expires.
7. `npm test` and `npm run typecheck` pass, with new tests for the mapping and chunking.

## Scope

**In:**
- `src/sources/garminApi.ts`, which implements the existing `ActivitySource` interface (`read(fromMs, toMs)`).
- `src/sources/garminApiMapping.ts`: pure functions that turn Garmin JSON into `SourceActivity`, `SourceSleep`, `SourceDaily` and `SourceWeight`. Unit tested against saved real responses.
- Token handling: swap the key for a bearer token (valid for up to 24 hours), cache it in secure storage with its expiry, and get a new one on a 401.
- Settings: a "Garmin (direct)" option in `app/edit/health.tsx`, a key field, a "Test connection" button, and the key's expiry date.
- Adding `'garmin_api'` to the `source` enums in `src/db/schema.ts`, plus a migration if drizzle generates one.
- README section: how to create the key and what it can and can't read.

**Out (for now):**
- Sending workouts or routes to the watch (the Personal API is read-only).
- Parsing FIT files for laps or streams (possible later via `download-service`).
- Strava. It stays as it is.
- Mixing sources, for example VO2 max from Garmin and everything else from Health Connect. It's one source at a time, to keep it simple.

## Garmin endpoints to use

Taken from Garmin's official client (`github.com/garmin/connect-personal-api-python`, `client.py`). Base URL is `https://personal.connectapi.garmin.com`.

| Data | Endpoint | Notes |
| --- | --- | --- |
| Token | `POST /personalapitoken-service/personal-api/personal-api-key/token`, header `Authorization: ApiKey <key>` | Returns the bearer token (JWT text) |
| Activities | `GET /activitylist-service/activities/search/activities?startDate&endDate&start&limit` | Page through with `start` / `limit` |
| Sleep | `GET /sleep-service/sleep/dailySleepSummariesByDate?startDate&endDate` | 31-day max window |
| Daily summary | `GET /usersummary-service/v2/dailysummaries?startDate&endDate` | Resting HR, steps, active kcal |
| HRV | `GET /hrv-service/hrv/daily/{start}/{end}` | Nightly HRV |
| VO2 max | `GET /metrics-service/metrics/maxmet/daily/{start}/{end}` | Optional `sport` filter |
| Weight | Weight measurements range endpoint (`get_weight_measurements` in the client) | `includeAll=true` |
| Body Battery (later) | `GET /wellness-service/wellness/bodyBattery/reports/daily` | Not in this phase |

Requests are split into windows of 28 days or less, so they stay within every endpoint's limit. Garmin hasn't published rate limits, so the sync makes requests one after another, with a short backoff on 429.

## Decisions for you

1. **Add `expo-secure-store`** (an Expo first-party library) to store the key. Your project rules say to ask before adding libraries. Recommended: yes.
2. **One source at a time** (recommended), or a mixed mode where Garmin fills in only what the phone store is missing? Mixed is more code and has more edge cases.
3. **Key length:** a 1-year key, with the app warning 14 days before it expires. Recommended.

## Risks and unknowns

- **Response shapes** aren't documented in the Python client, which returns raw JSON. To build the mappers against real data, phase 1 captures sample responses on your Mac. You run the official `gc-personal` CLI with your key, so the key never leaves your machine. The saved JSON goes into `src/sources/__fixtures__/garmin/` with personal details removed.
- **VO2 max and other Garmin-calculated numbers** might be stripped in the Personal API, as reported for the business API. The fixtures will show this. If they're missing, the manual entry stays.
- **Phone network:** syncing now needs internet. The phone store works offline. That's another reason to keep both sources available.

## Phases (stop after each one so you can test)

1. **Fixtures.** You create the key and run the capture script on your Mac. I write the mappers and tests against the real JSON. Nothing changes in the app yet.
2. **Source and token handling.** `garminApi.ts`, secure storage, retries, plus unit tests with a mocked fetch.
3. **Settings UI and schema.** The source option, the key field, "Test connection", the expiry warning, and the migration.
4. **On-device check.** Build the APK or iOS sim build, sync, and compare a week against Garmin Connect, including the Richmond Half on Nov 14 and VO2 max. Then bump to v0.17.0 and update the README.
