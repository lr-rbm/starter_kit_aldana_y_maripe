# Aldana & MP — Meta Ray-Ban Display Apps

A collection of small, self-contained web apps for the [Meta Ray-Ban Display glasses](https://wearables.developer.meta.com/docs). Each app is vanilla HTML/CSS/JS designed for a **600×600 lens** driven by a **D-pad** — no build step, no framework.

## Apps by Aldana & MP

Apps we built in this kit:

| App | What it does | Live |
|---|---|---|
| [Raincheck](raincheck/) | Will it rain today? Day verdict plus morning/afternoon/evening bands for any city | [raincheck-nine.vercel.app](https://raincheck-nine.vercel.app) |
| [Pepe of the Day](pepe-of-the-day/) | A fresh Pepe served once a day | [pepe-of-the-day.vercel.app](https://pepe-of-the-day.vercel.app) |
| [Rolunchete](rolunchete/) | Spin-the-wheel decider for picking from your own options | [rolunchete.vercel.app](https://rolunchete.vercel.app) |
| [Ballsy 8](ballsy-8/) | Magic 8-ball — ask a question, get an answer | [ballsy-8.vercel.app](https://ballsy-8.vercel.app) |
| [Humans in Space](humans-in-space/) | How many people are in space right now, floating around with their names, nationality flags, and craft | [humans-in-space.vercel.app](https://humans-in-space.vercel.app) |
| [Quick Timer](quick-timer/) | Tap a preset (1/2/5/10/15 min) or dial a custom time, then count down with a progress ring | [quick-timer.vercel.app](https://quick-timer.vercel.app) |

---

## About this repo

This repository is based on L+R's open-source [Meta Ray-Ban Display demos](https://levinriegner.com) starter template. The template's demos (listed at the bottom) are kept as **reference and inspiration**; our own apps live as new folders at the root and are tracked in the table above.

### How it works

Each app is one folder at the repo root containing `index.html`, `styles.css`, `app.js`, and an optional `favicon.svg`. A folder counts as an app if it has an `index.html`. There's no bundler or `package.json` per app — point a browser at the files and they run.

Apps are deployed to Vercel from their own folder:

```bash
cd <app-name> && npx vercel@latest --prod --yes
```

The first deploy creates the project and links the folder; later deploys reuse the same project, so the production URL stays stable.

### Working with Claude Code

This repo is set up to be driven by Claude Code — describe the app or change you want and it builds, deploys, and returns the URL. The conventions Claude follows (folder layout, hardware constraints, deploy flow) live in [`CLAUDE.md`](CLAUDE.md).

---

## What the glasses are like

- **Screen:** 600×600 pixels, single eye, transparent. Black pixels = see-through; whatever you draw "floats" on top of the world. Prefer pure `#000` backgrounds.
- **Inputs:** a D-pad (`▲ ▼ ◀ ▶`) and an `Enter` button. No mouse, no typing, no on-screen keyboard, no close (×) button, no Esc key. Some apps also use head gestures (nod, shake) via the IMU sensor.
- **Design vibe:** big text, high contrast, minimal chrome. Think dashboard, not website.
- **Preview without hardware:** [displayglasses.dev](https://displayglasses.dev) — paste any URL and it shows the app layered onto a real-world background.

---

## Template demos (reference)

These ship with the L+R template. They're not ours — they're here as patterns to borrow from (timers, lists, pickers, games, sensors).

### Polished

| Demo | What it does |
|---|---|
| [Brush Coach](brusher/) | Toothbrush stroke counter that tracks brushing motion and guides you through mouth zones |
| [AWE Side-Events Guide](awe-events/) | Heads-up version of the L+R AWE USA 2026 side-events guide |
| [Calculator](calculator/) | Four-function calculator with multiple themes and D-pad input |
| [Cooking HUD](cooking-hud/) | Step-by-step recipe flow with a multi-timer rail and shop/prep/cook phases |
| [Dad Jokes](dad-jokes/) | Random dad jokes with auto-fitting type and rim-shot audio stings |
| [Flight Status](flight-status/) | Airline and flight lookup with terminal, gate, and boarding details |
| [GLIMMER](lr-glimmer/) | Tamagotchi-style companion with five evolution stages, stat decay, and events |
| [Metronome](metronome/) | Hands-free metronome with tempo, time signature, and head-nod beat input |
| [Pentatonic Solo](pentatonic-solo/) | Pentatonic synth locked to B minor with an animated oscilloscope |
| [Periff](periff/) | Voice recorder for ideas with transcription and a searchable archive |
| [Pinout HUD](pinout-hud/) | ESP32 pinout reference with board templates and a zoomable focus mode |
| [Tally Counter](tally-counter/) | Single-button tally counter with running total and "since" timestamp |
| [World Cup 2026](worldcup-2026/) | Glanceable tournament companion with countdown, groups, bracket, live match |
| [Zork Terminal](zork-terminal/) | CRT-styled text adventure with D-pad verb picker and typewriter output |

### Smaller / experimental

| Demo | What it does |
|---|---|
| [Chores](chores/) | Daily chore checklist with one-tap supply reorders |
| [Crypto Tracker](crypto-tracker/) | Live crypto prices, 24h change, and favorites |
| [Flashcards (Serbian)](flashcards-serbian/) | Vocabulary trainer with Learn and Test modes |
| [Kairos Calendar HUD](kairos-calendar-hud/) | Ambient calendar with today/next/free/tomorrow zones |
| [Knot Helpful](knot-help/) | Step-by-step tutor for six famous knots |
| [Meditation](meditation/) | Box-breathing timer with animated guide and history |
| [Origami Sensei](origami-sensei/) | Step-by-step paper-folding instructor |
| [Plane Spotter](plane-spotter/) | Tracks the nearest aircraft with a head-tracked arrow |
| [Pomodoro](pomodoro/) | 25/5/15 minute timer with cycle stats |
| [Presto](presto/) | Sleight-of-hand magic coach with tricks and patter |
| [Recipe Stepper](recipe-stepper/) | Paginates any recipe into D-pad-friendly steps via AI |
| [See DJ](see-dj/) | Passive booth HUD that reads Pro DJ Link telemetry |
| [Snake](snake/) | Classic Snake game with D-pad and local high scores |
| [Trivia Live](trivia-live/) | 10-question live trivia from the Open Trivia DB |
| [Twitch Chat HUD](twitch-chat/) | Large-type Twitch chat feed for hands-free streamers |
| [Weather Dashboard](weather-dashboard/) | 5-day forecast for preset cities |
| [World Clock](world-clock/) | Live local times for favorite cities |

### Proof-of-concepts (sensors, gestures, pairing)

| Demo | What it does |
|---|---|
| [Find My Car](find-my-car/) | Saves your parking spot and walks you back with compass bearing |
| [Head Gesture Prototype](head-gesture-prototype/) | Dismiss a notification with a head shake |
| [Headprint](headprint/) | Biometric wearer ID from a four-gesture head-motion profile |
| [Speedometer](speedometer/) | Live GPS speed readout with top-speed tracking |
| [Stub](stub/) | Receipt and ticket capture with OCR |
| [Teleprompter](teleprompter/) | Phone-side admin pushes live script lines to the glasses |
| [Tiltscroll Tales](tiltscroll-tales/) | Head-tilt-scrolled fairy tale across four chapters |

---

## License

MIT. Original demos by [L+R](https://levinriegner.com).
