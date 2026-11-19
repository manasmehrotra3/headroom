# Tokyo Night

A Tokyo Night look for Claude Code in the desktop app and the mobile app: the
whole palette plus a moving city behind the conversation.

## What it does

- **Colors.** Tokyo Night by night and Tokyo Night Day by day, built from a
  handful of anchor colors so every surface, border, diff and syntax color in
  the app follows. It serves both light and dark mode, so it follows whichever
  one the app is in rather than forcing a mode.
- **A scene.** A skyline behind the conversation: stars that twinkle, clouds
  that drift across, lit windows that flicker on and off, neon strips that
  pulse along the towers, beacons on the antennae, a train of light that
  crosses now and then, and a shooting star every so often. The night scene is
  the default; in light mode the sky turns to a pale afternoon.
- **Reduced motion.** Every moving part has a resting place and opacity in the
  plain markup, so the scene still looks finished when the animation is taken
  out.

The terminal draws no look, so this changes nothing there.

## Commands

- `/plain` takes the look off for the session.
- `/tokyonight` puts it back on.

## Install

```
/plugin install tokyo-night --marketplace <owner>/<repo>
```

Answer `y` to add the marketplace, then pick a scope. The look applies to every
session started after that, in the desktop app and the mobile app.
