## What this changes

<!-- One or two sentences. If it changes behaviour the user can see, say what they will see. -->

## Why

<!-- The problem, not the patch. Link an issue if there is one. -->

## How it was checked

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] Tried on a device or emulator — which, and what I did:
- [ ] Could not verify: <!-- e.g. "no Garmin watch, so the Health Connect path is untested" -->

## Notes

- [ ] Logic that belongs in `src/domain` is there, pure, and has tests
- [ ] New tunable numbers went into `src/config/tunables.ts`
- [ ] No data leaves the device, and no health data goes near a language model
