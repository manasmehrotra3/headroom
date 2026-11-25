# Headroom

A local-first fitness and nutrition app: Garmin data via Health Connect (or Apple Health, or straight from Garmin), a deterministic training-plan engine, a gym workout player, and Indian vegetarian nutrition tracking. Built for one person and sideloaded, not published to any store — but the whole thing is here if you want to build it for yourself or take pieces of it.

The name is the idea: every morning it works out how much training you have room for, given your load ratio, your readiness and the daily time cap.
Expo SDK 57 + React Native + TypeScript. **All data stays on the phone** — there is no server, no account and no analytics.

> Not medical advice. This is a personal tool that makes training and nutrition suggestions from your own numbers; it is not a medical device and has not been reviewed by anyone qualified to review it. Talk to a doctor or a physiotherapist before acting on anything it says, especially about pain or injuries.

## What it does

- **Today**: a greeting with your name, then stat cards you swipe through in pairs (readiness and sleep, then training load and VO2 max), steps against your goal, the morning check-in, today's planned session, **everything you actually did today** with its time, distance, heart rate and effort, calories and protein against target, a trends card (weight or steps over one, three or six months) and this week's sessions. Sessions from the last week that still carry an estimated effort get a rating prompt.
- **Steps and VO2 max widget**: a home screen (and, where Android supports it, lock screen) widget with today's steps against the goal on one side and the latest VO2 max with its trend on the other. Native Kotlin, reads the app's database directly, refreshes every 30 minutes without waking the app.
- **Train**: the week's plan with a reason on every change. **Tap any day to see its whole plan**: the exercise list with sets, reps, rest, the station to look for and the suggested weight from your last sessions, or, for a run or ride, the structure step by step. Move / skip / sick / travel and the week rebalances without cramming. Full-screen workout player for YMCA strength days (one exercise at a time, frames, cues, prefilled steppers, auto rest timer with vibration, swap, session timer against the 50-min cap, session RPE). Structured runs with VDOT paces, structured rides with heart-rate zones and cadence, and planned-vs-actual after the watch syncs. Manual log for tennis and anything else.
- **Race goal mode**: add a race (5K through marathon, sprint / Olympic tri, Ironman 70.3) and the plan builds toward it — phases (base → build → peak → taper → race week), a long ride and long run that ramp and then taper, a predicted finish, and an honest readiness check. A triathlon switches the week to two strength days, a quality ride, a quality run and a Saturday long ride with a brick run, keeping Sunday tennis. From the date swimming starts, two of those days become swims (see Swimming).
- **Run history**: every run with pace and heart-rate trends, and pace compared at a similar heart rate.
- **Food**: calorie and protein rings, quick add from ~180 Indian vegetarian foods with household servings, favourites, recents, copy yesterday, custom recipes, USDA search, barcode scanning. Alongside breakfast, lunch, snack and dinner there is an **Extras** list for anything eaten outside the planned meals, fruit through the day or a yoghurt, with no limit on how many things go in it. Rule-based weekly meal plan (protein anchor per meal, no repeats within 3 days, swap any meal) and grocery list. Optional "cook once, eat twice" plans the same dinner two evenings running.
- **Progress**: 7-day-average weight trend, waist, VO2 max over 90 days, progress photos (on-device only), and the Sunday weekly review (weight, strength PRs, pace at similar heart rate, adherence, next week's plan with its changes explained).
- **Look and navigation**: a dark theme with a dusky gradient glowing behind the top of every screen and translucent cards over it. A floating tab bar (Today, Train, Food, Progress) with a **+** button for quick logging: check-in, food, weight, activity. Settings is behind the gear at the top of each tab.
- **Notifications**: morning digest (one line: sleep, readiness, load, session, targets) and an evening preview of tomorrow's session and meals. Times in Settings.
- **Data**: Garmin via Health Connect (read only), or directly from Garmin Connect with a Personal API key, which also brings VO2 max and HRV. A demo-data mode generates realistic data for emulators. JSON backup and restore.

## One-time setup (Mac)

You need Node 22, JDK 17 and the Android SDK. Android Studio installs the SDK to `~/Library/Android/sdk`.

```bash
npm install
```

Add this to `~/.zshrc` so Gradle and adb find the SDK:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

### One-time: create your signing key

Android only installs an update over an existing app if both are signed with **the same key**. Create the key once and back it up.

```bash
mkdir -p ~/keys && keytool -genkeypair -v -storetype PKCS12 -keystore ~/keys/headroom-release.jks -alias headroom -keyalg RSA -keysize 2048 -validity 10000
```

keytool asks for a password. Then add these lines to `~/.gradle/gradle.properties` (create the file if needed). This lives outside the repo and must never be committed.

```properties
HEADROOM_STORE_FILE=/Users/<you>/keys/headroom-release.jks
HEADROOM_STORE_PASSWORD=<the password you chose>
HEADROOM_KEY_ALIAS=headroom
HEADROOM_KEY_PASSWORD=<the password you chose>
```

**Back up `headroom-release.jks` and the password** to a password manager or other safe place. If the key is lost, the only way to install a new version is to uninstall first, and uninstalling deletes all app data.

### Checking a build is signed with your key

```bash
~/Library/Android/sdk/build-tools/*/apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk
```

It prints the certificate's owner and its SHA-256 digest. Note both down the first time you build, and check every later build still matches: a different digest means a different key, and the phone will refuse the update.

If it says `CN=Android Debug` instead, Gradle could not read `~/.gradle/gradle.properties`, and that APK must not go on your phone.

## Build the APK

```bash
npm run apk
```

Output: `android/app/build/outputs/apk/release/app-release.apk` (about 40 MB, arm64 only). If the script warns that no release key is configured, stop and set the key up first. The first build takes a few minutes; later ones are faster.

## Install on the phone

**Over USB (recommended)**

1. On the phone: Settings → About phone → tap *Build number* 7 times. Then Settings → System → Developer options → turn on **USB debugging**.
2. Plug in the phone and accept the "Allow USB debugging?" prompt.
3. Install:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

**Without a cable:** copy the APK to the phone (Google Drive, Files, etc.), open it, and allow "Install unknown apps" for that app when asked.

## Updating without losing data

- Always build with the **same signing key** and the same package id (`com.manasmehrotra.headroom`, set in `app.json`; never change it once it is on your phone).
- Always install with `adb install -r` or by opening the new APK over the old one. **Never uninstall.** Uninstalling wipes the database and resets the Health Connect permission history.
- Bump `expo.android.versionCode` in `app.json` for each release. It must never go down.
- Database changes are applied automatically on launch by migrations, so existing data carries over.
- Settings → Backup & restore exports everything as one JSON file. Do that before big updates.

## iOS

The same app runs on iPhone, with the same features as Android. On iPhone, Garmin Connect writes to **Apple Health** rather than Health Connect, and Headroom reads it from there. The home and lock screen widget is a native WidgetKit extension showing the same steps and VO2 max.

What differs underneath:

- **Apple Health, not Health Connect.** `src/sources/appleHealth.ts` mirrors `healthConnect.ts` and produces the same data. Steps and active calories come from Apple Health's daily totals, which de-duplicate the iPhone's own step counter against the watch; adding up raw samples would roughly double your steps.
- **Heart-rate variability is SDNN**, the only HRV measure Apple Health offers, where Health Connect gives RMSSD. Readiness compares today with your own recent baseline, so it works the same, but the numbers aren't comparable between the two phones.
- **Apple never tells an app which Health categories you allowed**, on purpose. If something is missing, open **Settings → Garmin & Apple Health → Inspect last 7 days**: a category you switched off shows as "none". Change permissions in the Health app → your profile picture → Apps → Headroom.
- **The widget** can't open the app's database the way the Android one does. After each sync the app writes a small snapshot to an App Group they share (`group.com.manasmehrotra.headroom`) and asks iOS to redraw. The widget's Swift code lives in `targets/widget/`.

### One-time setup

Xcode is needed from the Mac App Store, plus CocoaPods:

```bash
brew install cocoapods
```

If an old Ruby version manager such as rbenv also has a `pod` command, the build script puts Homebrew's copy first, so you don't need to change your shell setup.

### Run it in the simulator

```bash
npm run ios:sim
```

That regenerates `ios/` from `app.json` and `plugins/`, builds a Release version with the JavaScript bundled in, and installs and launches it on an iPhone 17 Pro simulator. Pick another with `SIMULATOR="iPhone 17" npm run ios:sim`. The first build takes several minutes while CocoaPods compiles everything; later ones are much faster.

### Put it on your iPhone

There is no APK-style sideloading on iPhone. Apps you build yourself are signed with your Apple ID through Xcode:

1. Run `npm run ios:sim` once so `ios/` exists, then open `ios/Headroom.xcworkspace` in Xcode.
2. Xcode → Settings → Accounts → add your Apple ID.
3. Select the Headroom target → Signing & Capabilities → Team → your name.
4. On the iPhone: Settings → Privacy & Security → Developer Mode → on, then restart it.
5. Plug the iPhone in, choose it as the run destination, and press Run.

Two limits depend on which kind of Apple account you use:

| | Free Apple ID | Apple Developer Program |
|---|---|---|
| Cost | free | $99 a year |
| App keeps launching for | 7 days, then reinstall from Xcode | 1 year |

Reinstalling from Xcode over the top keeps your data, the same way `adb install -r` does on Android. **Never delete the app from the iPhone**; that erases its database.

**Add your team ID to `app.json` before building for the iPhone.** The widget is a second target that shares an App Group with the app, and both must be signed by the same team. `ios/` is regenerated from scratch on every build, so a Team picked in Xcode would be forgotten; put it in the `ios` block instead:

```json
"ios": {
  "appleTeamId": "ABCDE12345",
  ...
}
```

Xcode shows the ID under Settings → Accounts → your Apple ID → the team's details. It is an identifier, not a secret.

With the team ID set, Xcode's automatic signing creates the app IDs, the HealthKit capability and the App Group for you the first time you run on the iPhone.

### Turning on Garmin → Apple Health

1. In **Garmin Connect** on the iPhone: **More** → **Settings** → **Connected Apps** → **Apple Health** (names differ slightly by version) → turn on every category.
2. In Headroom: **Settings → Garmin & Apple Health → Connect**, and turn on every category on Apple's sheet.
3. Tap **Re-read everything** once to pull in whatever history Garmin shared, then **Inspect last 7 days** to see which categories actually arrive. Garmin's own list of what it shares with Apple Health couldn't be confirmed, so this is how to find out, especially for HRV and VO2 max.

### Adding the widget

Long-press the home screen → **Edit** → **Add Widget** → **Headroom** → pick small or medium. For the lock screen: long-press the lock screen → **Customize** → **Lock Screen** → tap the widget row → **Headroom**. It shows the numbers from the last sync and refreshes whenever the app syncs.

### Differences worth knowing

- **Background refresh.** iOS decides when background tasks run, and runs them less often than Android. The morning digest still arrives; if the background sync didn't manage to run, it is the "tap to refresh" version.

## Turning on Garmin → Health Connect

Garmin Connect copies watch data into Android Health Connect, and this app reads it from there. Nothing is written back.

1. In **Garmin Connect** on the phone: **More** (☰) → **Settings** → **Connected Apps** (names differ slightly by version) → **Health Connect** → turn on and allow every data type.
2. In this app: **Settings → Garmin & Health Connect → Connect**, then allow all the read permissions, including *background access* and *history* (data older than 30 days).
3. Tap **Inspect last 7 days** to see what Garmin actually shares. HRV and sleep stages may not be; every score copes without them. Each row also shows the **oldest** record Health Connect holds, which is the real limit on how much history the app can ever see.
4. Tap **Re-read everything** once, straight after connecting, to pull in whatever history Garmin backfilled. Do the same after an update that adds a new metric, so it fills in instead of starting from today.

It reads exercise sessions, heart rate, resting heart rate, HRV, sleep, steps, active calories, distance, weight and VO2 max.

Garmin's own scores (Body Battery, sleep score, training readiness) aren't shared with Health Connect, so the app computes its own versions (formulas in `src/domain/sleepScore.ts`, `readiness.ts`, `load.ts`).

On an emulator or before the watch is connected, switch **Settings → Garmin & Health Connect → Demo data** to see every screen with generated data.

## Garmin (direct): the Personal API

A second way to get Garmin data, alongside the phone's health store. The app reads your Garmin Connect account straight from Garmin over the internet, with a key you create yourself. It exists because Garmin leaves VO2 max and HRV out of what it writes to Health Connect.

### Creating the key

1. Sign in to Garmin Connect on the web and open https://connect.garmin.com/app/settings/personalApiToken.
2. **Create Key**, accept the terms, choose how long it lasts (one year is the longest), **Create**.
3. Copy the key straight away. Garmin shows it once; if you lose it, delete it and make another.
4. In this app: **Settings → Garmin & Health Connect → Garmin (direct)**, paste the key, enter the expiry date Garmin showed, **Save key**.

Saving checks the key with Garmin and reads the last 60 days. Tap **Re-read everything** once afterwards to pull a full year, which is what fills in the VO2 max and HRV history.

### Where the key lives

Only in the phone's secure storage (Android Keystore-encrypted preferences, iOS Keychain), through `expo-secure-store`. It is never written to the database, so it is not in a backup file, and it is never logged. A backup restored on a new phone therefore needs the key pasted in again. Garmin does not take the key on each request: the app swaps it for a bearer token that lasts about a day, keeps that in secure storage too, and gets a new one when it is nearly out or Garmin refuses it.

Garmin does not tell the app when a key expires, so the expiry date is the one you type in. Today shows a warning from 14 days before (`garmin.keyWarningDays`), and a plain message when Garmin stops accepting the key.

### What it reads, and what it can't

| Data | From | Notes |
| --- | --- | --- |
| Activities | activity list | Type, start, finish, distance, heart rate, active calories. Swims, rides, runs, strength and racket sports map to the app's types |
| Sleep | nightly summaries | Time asleep and the **total** minutes of deep, light, REM and awake |
| Resting heart rate, steps, active calories | daily summaries | |
| HRV | nightly HRV summaries | Garmin's overnight average. Health Connect never has this |
| VO2 max | daily VO2 max | Appears on days Garmin made a new estimate. Health Connect never has this |
| Weight | weigh-ins | Including ones typed into Garmin Connect |

Things to know:

- **Sleep stages come as totals, not a timeline.** The sleep score only uses the totals, so it is unaffected, but the stored stage blocks are laid end to end rather than at the times they happened.
- **Read-only.** The Personal API cannot send workouts or routes to the watch.
- **It needs the internet.** The phone's health store works offline; this does not. A sync with no connection fails with a message saying so and tries again next time.
- **One source at a time.** Pick Garmin (direct) or the phone's health store, not a mix. Switching back and forth is safe: an activity that arrives from both is recognised as the same session (same type, start within 5 minutes, similar length) and counted once, and the same goes for weigh-ins.
- **No laps or second-by-second data.** Only activity summaries are read. FIT files are available from the API and could be parsed later.
- **Garmin publishes no rate limits**, so the app asks for four weeks at a time (`garmin.windowDays`), one request after another, and backs off when told to slow down. A normal sync is about seven requests; a full year is about seventy.

### For development

The mappers in `src/sources/garminApiMapping.ts` are tested against real responses saved in `src/sources/__fixtures__/garmin/`. To capture your own, put the key in `~/.config/garmin/connect-personal-api-key` (the file Garmin's own CLI reads) and run:

```bash
node scripts/capture-garmin-fixtures.js
```

It writes each response twice: untouched into `.garmin-capture/` (git-ignored), and with names, account ids and locations removed into the fixtures folder. The fixtures still hold real heart rate, sleep and weight numbers, so read them before committing.

## Step counts, and why they must be aggregated

A phone's health store can hold the same stretch of time more than once, typically when the watch re-sends a period it already sent. Adding up every raw record then counts those minutes twice: on one Android phone in September 2026 that turned a real 5,006-step day into 5,726.

So daily steps and active calories are never summed by hand. Android asks Health Connect for its own daily totals (`aggregateGroupByPeriod`), and iOS asks Apple Health for its daily statistics. Both de-duplicate overlaps.

On Android the totals are limited to Garmin Connect's own records (`TUNABLES.sync.watchApp`), and so are distance, calories and workouts. Across every app, Health Connect fills gaps in the watch's record with steps the phone counted itself (Samsung Health, for one), which read 9,673 on a day Garmin Connect showed 9,087. Other apps' steps are never used, even on a day the watch wrote nothing. Heart rate, sleep, HRV, weight and VO2 max are still read from any app, since a phone cannot measure them. Session distance and calories come from raw records, since they must line up with a workout's start and end, but they are added with `sumWithoutOverlap`, which skips any record covering time already counted. An inflated run distance would otherwise quietly corrupt the paces the plan is built from.

One trap worth remembering: Health Connect starts its day-long buckets at the beginning of the range you ask for, not at midnight. Ask from the time of the last sync and the days slice at, say, 18:40, so today's steps get filed under yesterday. The range is anchored to local midnight for that reason.

After changing how totals are computed, run **Settings → Garmin & Health Connect → Re-read everything** once. A normal sync only revisits the last few days, so older days keep whatever was stored at the time.

## How much Garmin history you can get

Three separate limits, and the one that binds is not ours.

- **This app** reads 60 days on the first sync (`sync.initialDays`), then only the last few days each time. **Re-read everything** widens that to a year (`sync.backfillDays`).
- **Health Connect** lets apps read the last 30 days by default, measured from when you first granted permission rather than as a rolling window. The app declares `READ_HEALTH_DATA_HISTORY`, which lifts that with no documented upper bound. Uninstalling revokes the grant and restarts the 30-day clock, which is a second reason never to uninstall.
- **Garmin** decides how much it backfills into Health Connect when you first connect, and does not document it. Expect roughly the last month, then everything forward. The Data Inspector's "oldest" column tells you what you actually got.

So the history that matters accrues from the day you connect the watch. Connect it sooner rather than later.

Reads are chunked a month at a time (`sync.chunkDays`). Garmin writes near-continuous heart rate, so a year read in one go would hold millions of samples at once; chunking keeps peak memory flat however wide the window. The per-session attribution is a binary search over the session list, unit tested in `src/sources/windowing.test.ts` against a brute-force scan.

## Environment variables

Optional. Create `.env.local` (git-ignored):

```
EXPO_PUBLIC_USDA_API_KEY=your_key_here
```

Get a free key from https://api.data.gov/signup. Without it, USDA search is disabled; the local food database and barcode scanning (Open Food Facts, no key) still work.

## Day-to-day development

```bash
npm run android
```

Builds a development client onto the USB-connected phone or emulator, with hot reload. Later runs only need `npm start`.

```bash
npm test
```

```bash
npm run typecheck
```

After changing `src/db/schema.ts`, generate a migration and commit it:

```bash
npm run db:generate
```

## How the code is organised

```
app/               Screens (Expo Router). (tabs)/ main tabs · onboarding/ · edit/ settings forms
                   workout/ player · run/ structured run · food/ · log/ check-in & activity · insights/ breakdowns
src/config/        tunables.ts: every adjustable number in one place
src/domain/        Pure TypeScript logic, no React. Unit tested (*.test.ts next to each file)
                   load, sleepScore, readiness, dedupe, weightTrend, review
                   strength/ progression, session time, workout builder
                   running/ VDOT and structured runs
                   plan/ week builder, rules, day adjustments, rescheduling
                   nutrition/ targets, meal plan, recipes
src/data/          exercises.ts (library), workoutTemplates.ts, foods.ts (seed DB), youtube.json, exerciseImages.ts (generated)
src/db/            Drizzle schema, generated migrations, repos (the only code that touches the database)
src/sources/       Where activity data comes from: healthConnect.ts, appleHealth.ts, garminApi.ts, mock.ts (same interface)
src/sync/          syncService (read → store → dedupe → recompute), background task, notifications, digest text, backup
src/services/      USDA and Open Food Facts lookups
src/features/      Screen pieces grouped by feature (workout player parts, forms, plan cards)
src/ui/            Theme and gradient backdrop, shared components, the card kit (cards.tsx), charts and their tested geometry, icons, formatting
assets/exercises/  Two frames per exercise from free-exercise-db (public domain)
src/domain/cycling/ Bike zones and structured rides
src/domain/swimming/ Swim progression and structured pool swims
src/domain/plan/race.ts  Race types, phases, long-session progression, race-week template
plugins/           Expo config plugins: release signing, Health Connect permissions, the steps and VO2 max widget (Kotlin)
scripts/           build-apk.sh, make-icons.js (every app icon from one description), gen-exercise-images.js
```

Rules of thumb:
- Logic lives in `src/domain` as plain functions that return results plus human-readable reasons. Screens only load data and render it.
- The database stores SI units (kg, cm, m, s). Pounds, miles and feet/inches are converted only for display and input.
- Repo functions read SQLite synchronously, so calling one straight from a component body re-runs it on every render. Screens wrap them in `useDbValue` (`src/db/useDbValue.ts`) with the `updatedAt` stamps of the live queries covering every table that read can see — which keeps it exactly as fresh as a direct call. Lists longer than a screenful or two use a `FlatList` inside `<Screen scroll={false}>` with `SCREEN_PADDING`, because a `FlatList` nested in a `ScrollView` renders every row.
- A render error anywhere lands on the `ErrorBoundary` in `app/_layout.tsx` rather than a blank screen, and shows the message to report. Nothing is sent anywhere — there is no crash reporting.
- To tweak behaviour (caps, thresholds, percentages, rep ranges), edit `src/config/tunables.ts`.
- To add an exercise: append to `src/data/exercises.ts`, drop two frames in `assets/exercises/<id>/0.jpg` and `1.jpg`, run `node scripts/gen-exercise-images.js`.
- To change the look: colours and the backdrop gradient are tokens in `src/ui/theme.ts`. Cards are translucent (`surface`) so the gradient shows through; anything that floats over content, such as bottom sheets and the tab bar, uses the opaque `sheet` colour or content bleeds through it. Gradients are drawn with react-native-svg, so there is no gradient or blur library.
- To change the app icon: edit the shapes in `scripts/make-icons.js` and run `node scripts/make-icons.js`. It writes every icon the app needs — square icon, the three adaptive layers, splash, favicon and the Android notification icon — from one description, so they can't drift apart. Two deliberate differences: the adaptive layers are drawn smaller, because some launchers mask the icon to a circle and would clip the ceiling line; and the notification icon is solid white on transparency with a thicker ceiling, because Android throws away a small icon's colours and draws only its silhouette, at a size where a thin line disappears. Leaving that icon unset is what makes a notification show a featureless blob: the launcher icon is opaque corner to corner, so its silhouette is a square.
- To add a YouTube video for an exercise: edit `src/data/youtube.json`.
- To add a food or dish: append to `src/data/foods.ts` (new ids are added on the next launch; existing rows aren't overwritten).
- The widget lives in `plugins/withStepsWidget.js` (the name still says steps so that widgets already placed on a home screen keep working): the Kotlin, layout and manifest entry are generated into `android/` at prebuild, so edit the plugin, not the generated files.

## The plan for a day

Tapping a card on Train (or today's session on the dashboard) opens the full plan for that day.

- A run goes to `app/run/[id].tsx` and a ride to `app/ride/[id].tsx`, which already show the structure, the paces or zones, and planned vs actual.
- Everything else goes to `app/plan/[id].tsx`: target minutes, the variant, the add-on, where it was moved from, the reasons behind it, and for a strength or mobility day the whole exercise list.

That list comes from `previewWorkout` in `src/features/workout/startWorkout.ts`, which runs the same `buildWorkout` that Start runs but writes nothing, so what you read is what you get. It is built from today's equipment and check-in, so a future day is a good preview rather than a promise; pressing Start rebuilds it. Suggested weights come from `suggestWeight` against your logged history and are only shown for exercises that take a load.

## Meal slots

The weekly plan fills four meals: breakfast, lunch, snack and dinner. Those are `MEAL_SLOTS`, and `nutrition.slotShare` in tunables divides the day's calories between them.

Logging has one more: **extra**. It exists because food eaten outside the planned meals has nothing to do with the plan, and giving it a share of the targets would be wrong. `LOG_SLOTS` is the planned four plus extras, and `isPlannedSlot` is what keeps the planner away from them. Extras count toward the day's totals and rings exactly like anything else; they just never get planned or put on the grocery list.

Adding another named meal means adding it to `LOG_SLOTS` and `LOG_SLOT_LABELS` in `src/domain/nutrition/types.ts` and to the column's enum in `src/db/schema.ts`. Both lists are checked by a test, so a slot without a label fails rather than rendering blank.

## The maths, briefly

- **Session load** = session RPE × minutes. **ACWR** = last 7 days ÷ (last 28 days ÷ 4). Sweet spot 0.8–1.3.
- **TRIMP** (Banister) shown per run with heart rate.
- **Sleep score**: duration vs target 40, efficiency 20, deep+REM 20, bed/wake consistency 20; missing parts re-weighted.
- **Readiness**: sleep 35, resting HR vs 28-day baseline 25, HRV vs 7-day baseline 20, check-in 20. Pain is handled by the plan, not the score.
- **Plan rules** (in order): pain → deload (every 4th week or 3 low-readiness days) → ACWR trim → run volume ≤ +10 %/week and none when adding intensity → bike volume ≤ +10 %/week → lighter Monday after long/hard tennis → no heavy legs before a run or long ride → time cap. Day-of: low readiness swaps in the easy version; pain removes exercises that load the area (knee/hip pain stops rides too; shin or calf pain leaves them alone, because cycling is good cross-training; shoulder, neck or elbow pain stops swims).
- **Time caps**: weekdays stay at 50 minutes. The weekend long session gets its own allowance — the long session plus 30 minutes, up to a 4-hour ceiling — so a 3-hour ride is possible without the cap fighting it.
- **Race phases**: counted back from race day, e.g. a 70.3 is 2 taper weeks, 4 peak, 6 build, base before that. The long ride ramps from 60 min toward 210 over the last ~10 weeks, then drops to 60 % in the taper and 40 % in race week. The 10 %-a-week governor still applies, so the ramp is the ceiling, not the plan.
- **Bike zones**: from an estimated cycling max heart rate (running max − 10). Z1 < 68 %, Z2 68–75 %, Z3 76–83 %, Z4 84–92 %, Z5 93 %+. Each zone also carries an RPE for gym bikes or a flat strap.
- **Re-planning**: the days still to come are rebuilt from the template on every app open, then the rules run once. That means an adjustment undoes itself when its reason goes away (clear the knee pain and the ride comes back), and durations never ratchet down across restarts. Days you moved by hand, and anything already done, are left alone.
- **Strength**: double progression. Top of the rep range on every set at RPE ≤ 8 → +2.5–5 lb upper / +5–10 lb lower. Missing the bottom of the range two sessions running → drop ~7.5 %.
- **Running paces**: Daniels VDOT from your 5K time; re-estimated every 3 weeks from runs with heart rate, ±1 VDOT per update.
- **Nutrition**: Mifflin-St Jeor × activity − deficit (0.6 %/week, ≤ 500 kcal, never below BMR). Protein 1.8 g/kg, fat ≥ 0.8 g/kg, carbs the rest; +15 % carbs on run/tennis days, −15 % on rest days. Reviewed every 14 days against the weight trend.

## The steps and VO2 max widget

Long-press the home screen → **Widgets** → **Headroom** → drag **Steps and VO2 max** where you want it. It is three cells wide by one tall by default and resizes in both directions.

Lock screen placement depends on your phone. The widget declares itself for both surfaces, so nothing extra is needed once the phone supports it. Google added lock screen widgets for phones in Android 16 QPR2 (Settings → Display & touch → Lock screen → *Widgets on lock screen*). Some manufacturer launchers allowed only their own apps on the lock screen for a long time and picked up the Android feature later; on those, long-press the lock screen → **Edit** → **Widgets**. If Headroom isn't offered there, that launcher version doesn't expose third-party widgets on the lock screen, and no app can work around that.

It is shaped to sit alongside the clock and weather widget: a capsule with rounded ends, translucent so the wallpaper tints it the same way. Steps read as the big line on the left, the way the date does on that widget, with the goal, a progress bar and the time of the last refresh underneath. VO2 max sits on the right in a scalloped gold disc, where the weather widget puts its temperature, as the number alone. Its trend lives in the app rather than on the widget. The disc's outline is generated in `plugins/withStepsWidget.js` from a polar curve rather than drawn by hand.

It redraws whenever the app syncs: on open, on returning to it, and when the background task runs (`sync.backgroundIntervalMin`, every 30 minutes at best, since that is as often as Android will run it). Android itself also redraws it roughly every half hour, which is its floor. The app asks for the redraw through a small local module in `modules/widget-refresh/`; without it Android would only redraw on its own schedule, and the widget would sit showing old numbers long after a sync. The footer time is when the numbers were last refreshed, so you can always tell how old they are.

On the lock screen the app isn't running, so freshness there comes from the background task alone.

## VO2 max

**Garmin does not share VO2 max with Health Connect.** Checked on Android in September 2026 with the Data Inspector: Health Connect held no VO2 max record at any date, while heart rate, sleep, steps and resting heart rate all reached back months. Heart-rate variability is missing for the same reason, so readiness drops that component and re-weights the rest, which it is built to do.

The direct Garmin source does provide both: switch to **Garmin (direct)** (see above) and VO2 max and HRV sync on their own.

Otherwise, on Android you enter VO2 max yourself: **Settings → VO2 max**, copying the number from Garmin Connect under Performance Stats → VO2 Max. Every few weeks is plenty, since the watch only updates it every few runs. You can date a reading in the past to fill in the trend. A typed reading lives in the same place as a synced one, so the tile, the trend and the widget treat them alike; if a phone's health store ever does start providing VO2 max, a synced reading for that date wins. The tile on Today and the card on Progress both show the latest reading and the change across the window; tapping either opens the full trend, every reading, and an honest comparison against the VDOT the app works out from your actual running.

The two numbers rarely match, and neither is wrong. The watch estimates VO2 max from heart rate and pace; VDOT comes from how fast you actually race. **Training paces always come from VDOT**, never from the watch's VO2 max.

A change under 0.5 is treated as noise rather than fitness. Both that threshold and the 90-day window are in `src/config/tunables.ts` under `vo2`, and the widget's Kotlin copies of them are commented to say so.

**Settings → Garmin & Health Connect → Re-read everything** fills in history for anything the phone's store does provide, after connecting the watch or after an update adds a metric. It can't help with VO2 max on Android, because there is nothing there to read.

## Swimming

Swim sessions join the triathlon week from the Monday set in `swim.startDate` (7 December 2026). The plan holds one session a day, so each swim takes a day:

| Day | Before | From the start date |
| --- | --- | --- |
| Thursday | Strength: upper body | **Endurance swim**: one set of equal repeats |
| Friday | Mobility or rest | **Technique swim**: drills, then smooth swimming |

Monday's leg strength stays. Swimming works the upper body, which is why it replaces that strength day. There is no full rest day in this week; Friday's technique swim is the easy day.

- **Distance** starts at 800 m a session (`swim.startDistanceM`), which suits someone who cannot yet swim 200 m without stopping, and grows about 10 % a week. The technique swim levels off at 1,200 m and the endurance swim at 2,200 m, past the 70.3's 1,900 m.
- **Repeats get longer as the swim does**: 50s with a rest after each at first, then 100s, 200s and 400s.
- **Time.** The plan works in minutes, so a swim's distance is worked out from its minutes at `swim.minPer100m` (3 minutes per 100 m including rests, a beginner's pace). At that pace the 50-minute daily cap holds a session to about 1,700 m. Lower the number as you get faster and the sessions grow past it.
- **The rules apply to swims too.** A sore shoulder, neck or elbow turns a swim into mobility. A deload week shortens both swims and makes them technique swims. A low-readiness morning turns the endurance swim into a technique swim of the same length.
- **Pool.** Sets are written in 50s and 100s for a 50 m pool (`swim.poolLengthM`). Record the swim on the watch as a pool swim; it syncs, counts toward load and ticks the session off.

Swims only appear on their own when a triathlon is your next A race and **Settings → Races & race plan → Let the race reshape my week** is on. Otherwise, pick the two swim sessions for any day in **Settings → Weekly schedule**.

Not built: open-water sessions, a swim pace for the race prediction, and swim-specific strength work.

## Strava

Deferred. Since 2026 the Strava API requires a paid Strava subscription, limits apps to caching Strava data for 7 days, bans archiving it or anything derived from it, and forbids passing it to any AI model. Garmin → Health Connect already covers every run and tennis session. If it's ever built, `src/sources/` has the interface to implement, token exchange would live in a small AWS Lambda so the client secret never ships in the APK, and rows would auto-purge after 7 days. Registering an app: https://www.strava.com/settings/api (needs the subscription).

## Author

Built and maintained by Manas Mehrotra — [manasmehrotra.info](https://www.manasmehrotra.info).

Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md) for how the project is laid out and what makes a change easy to merge.

## Licences and data sources

- Exercise frames: [free-exercise-db](https://github.com/yuhonas/free-exercise-db), public domain.
- Food composition: Indian Food Composition Tables 2017 (NIN) for ingredients; dishes are recipe estimates and marked as such in the app. Packaged foods from Open Food Facts; USDA FoodData Central as a backup search.

MIT licensed. See [LICENSE](LICENSE).
