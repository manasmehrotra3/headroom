# Contributing

Thanks for looking. This started as one person's training app and is now open so other people can build it, fork it, or improve it. Small, focused pull requests are much easier to merge than large ones.

## Getting it running

```bash
npm install
npm test          # 257 domain tests, no device needed
npm run typecheck
```

For a phone or emulator, see **One-time setup** and **Build the APK** in the [README](README.md). You do not need the signing key to develop — `npx expo run:android` builds a debug app. You only need a key to produce an installable release APK, and you create your own.

There is no account, no server and no test fixtures of real data. Settings → Garmin & Health Connect has a **demo data** mode that generates six realistic weeks, which is how to work on any screen without a watch.

## Where things go

[README → How the code is organised](README.md#how-the-code-is-organised) has the full map. The three rules that matter most:

1. **Logic belongs in `src/domain`,** as plain functions with no React or React Native imports, returning a result *plus the human-readable reason for it*. Every rule the plan engine applies has to be able to explain itself in one line, because that line is shown in the app. Domain code is unit tested; a `*.test.ts` sits next to the file.
2. **Only `src/db/repos/*` touches the database.** Screens call repos; repos call Drizzle.
3. **Every tunable number lives in `src/config/tunables.ts`.** If you are about to write a magic number into logic, put it there instead and give it a name with its unit in it (`...Min`, `...Kg`, `...Days`).

Units: the database is SI (kg, cm, m, s). Pounds, miles and feet are display conversions only.

## Two data rules that are not negotiable

- **Everything stays on the device.** No analytics, no crash reporting, no accounts, no syncing to a server. The only network calls in the app are the optional USDA food search and Open Food Facts barcode lookups, both triggered by the user. A PR that adds a telemetry or crash SDK will be declined, however useful.
- **No health or activity data is ever sent to a language model.** There is no LLM in the app today. If one is ever added it gets profile, targets, preferences and the food database — never activity, heart rate, sleep or anything derived from them.

## Performance conventions

The database driver is synchronous, which makes repos pleasant to write and easy to get wrong in a component.

- Never call a repo function straight from a component body — it re-runs on every render. Wrap it in [`useDbValue`](src/db/useDbValue.ts) and pass the `updatedAt` stamps of the live queries covering every table that read can see. If a table is not live-queried on the screen, add a small query for it, otherwise the value goes stale.
- Lists that can grow past a screenful or two use `FlatList` with `<Screen scroll={false}>` and `SCREEN_PADDING`, not `.map` inside the default scrolling `Screen`. A `FlatList` nested in a `ScrollView` renders every row and windows nothing.

## Before you open a PR

```bash
npm test && npm run typecheck
```

Both must pass; CI runs exactly these. Then:

- **Add tests for domain logic.** Anything in `src/domain` should come with cases, including the edge the bug was about. Screens are not unit tested.
- **Say how you checked it on a device or emulator**, and what you could not check. Plenty of this app depends on Health Connect or HealthKit actually being there, and honest "not verified on a real watch" is far better than a guess.
- **Keep the comment style.** Comments here explain *why* a thing is the way it is — the Health Connect bucketing quirk, why the notification icon is a separate asset. Don't add comments that restate the code.
- Code is formatted at 180 columns, single quotes, trailing commas:
  ```bash
  npx prettier --write --single-quote --print-width 180 --trailing-comma all <files>
  ```

## Good first issues

- Swimming: swims sync and count toward load, but there are no structured swim sessions and no swim leg in the 70.3 plan.
- More foods and dishes in `src/data/foods.ts`, especially regional ones, with sources.
- Exercises and their alternatives in `src/data/exercises.ts`.
- Accessibility: labels, dynamic type, and contrast checks on the gradient backdrop.

## Not medical advice

This app makes training and nutrition suggestions from a person's own numbers. It is not a medical device. Please don't contribute anything that reads as a diagnosis, and keep the existing hedging where it already exists.
