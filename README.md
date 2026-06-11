# {{NAME}}'s Starter Kit — Build Apps for Meta Ray-Ban Display Glasses

Hi {{NAME}}! 👋

This is a personal starter kit so you can build small web apps for the [Meta Ray-Ban Display glasses](https://wearables.developer.meta.com/docs) just by **describing your idea to Claude**. No coding required. Works on both **Mac** and **Windows**.

Claude already knows everything about how the glasses work — the screen size, the D-pad, the design rules. It will build the app, deploy it online, and hand you back a URL you can open from any browser (or the [simulator](https://displayglasses.dev)) to see what your app looks like on the glasses.

---

## How it works in 3 steps

1. **Set up your computer once** (10 minutes — see [Setup](#setup-do-this-once) below).
2. **Open this folder in Claude** and describe the app you want.
3. **Get a URL back** — open it to see your app live.

That's the whole loop. Once setup is done, every new app you imagine takes one message.

---

## Setup (do this once)

You only need **two** things on your computer. Everything else — Vercel, account login, project setup — Claude will handle for you automatically the first time you ask for an app.

### 1. Install Claude Desktop

Download from [claude.ai/download](https://claude.ai/download) (works on Mac and Windows) and sign in with your Claude account.

### 2. Install Node.js

This is the only "developer thing" you need. It's a small program your computer uses to run web tools — including the one that puts your apps online.

- Go to **[nodejs.org](https://nodejs.org/)**.
- Click the big green **LTS** button. It auto-detects your computer:
  - **Mac**: downloads a `.pkg` file.
  - **Windows**: downloads a `.msi` file.
- Double-click the downloaded file and click **Next / Continue** through the installer. Accept the defaults.
- When it's done, close the installer window.

You don't need to open Terminal or PowerShell. You don't need to know what Node.js *is*. You just need it installed.

✅ **You're done with setup.** Skip everything below until your first app.

---

### What happens the first time you ask Claude to build an app

Claude will try to deploy your app to **Vercel** (the service that puts your app online and gives it a public URL). If you've never used Vercel on this computer:

1. Claude will pop open a browser tab asking you to log in or sign up.
2. **Sign up for the free Hobby plan** — it costs nothing and is more than enough for personal apps.
3. Click "Continue with Google" (or whichever option you prefer).
4. Close the browser tab when it says you're logged in.
5. Claude detects you're in and finishes deploying your app — you'll see a URL appear in chat shortly after.

You'll only do this once. After that, every new app deploys silently.

### Words you'll hear and what they mean

You won't need to know these in detail — but if Claude or this README mentions them, here's the gist:

- **Node.js** — a small program web tools need to run on your computer. You installed it in step 2.
- **Vercel** — the free service that puts your app on the internet and gives it a URL.
- **npx / npm** — built-in helpers from Node.js. Claude uses them; you don't.
- **Terminal (Mac) / PowerShell (Windows)** — a text window where commands run. Claude uses it; you don't have to type in it.
- **Deploy** — "put your app online so it has a URL".

If you're ever lost on a word, just ask Claude *"what does X mean?"* in plain English.

---

## How to build an app

Each time you have an idea:

### 1. Open this folder in Claude Desktop

- Open **Claude Desktop**.
- Click the **Code** tab in the sidebar.
- Click **Add project** and pick this folder (`starter_kit_{{SLUG}}`).

### 2. Describe what you want

Just type your idea in plain English. Examples that work great:

- *"Build a workout timer with rounds and rest periods, controlled by the D-pad."*
- *"Make me a tip calculator I can use in restaurants, with up/down to change the bill and left/right to change the tip percentage."*
- *"Build a card flipper that quizzes me on US state capitals."*
- *"Build a dice roller for tabletop RPGs with d4, d6, d8, d10, d12, d20."*

You don't need to describe the design — Claude already knows what looks good on the glasses.

### 3. Wait for the URL

Claude will:
1. Create a new folder for your app inside this project.
2. Deploy it to Vercel.
3. Reply with a URL like `https://your-app-{{SLUG}}.vercel.app`.

### 4. Preview it

Open the URL in:
- **A normal browser** to see the raw app at 600×600.
- **The [simulator](https://displayglasses.dev)** to see how it'll look layered on the real-world view through the glasses (paste your URL in the URL field).
- **The glasses browser** itself, if you have a pair handy.

### 5. Iterate

Don't like something? Just say so:
- *"Make the text bigger."*
- *"Use green instead of orange."*
- *"Add a reset button I can hold Enter on."*

Claude will update the code and redeploy. You'll get a new URL (or the same one updated).

---

## Tips for great results

- **Start simple.** One screen, one job. You can always add more later.
- **Think D-pad.** No typing, no mouse — only `▲ ▼ ◀ ▶` and `Enter`. If your idea needs typed input, replace it with a picker.
- **Black is transparent.** Anything you don't draw is see-through on the glasses. Bright, simple shapes pop best.
- **Ask for variations.** *"Show me 3 different layouts for this"* — Claude can iterate fast.
- **Steal from the gallery below.** Tell Claude *"build something like dad-jokes but with Chuck Norris jokes"* and it'll mirror that demo's style.

---

## By MP and Aldana

Apps we built in this kit:

| App | What it does | Live |
|---|---|---|
| [Raincheck](raincheck/) | Will it rain today? Day verdict plus morning/afternoon/evening bands for any city | [raincheck-nine.vercel.app](https://raincheck-nine.vercel.app) |
| [Pepe of the Day](pepe-of-the-day/) | A fresh Pepe served once a day | [pepe-of-the-day.vercel.app](https://pepe-of-the-day.vercel.app) |
| [Rolunchete](rolunchete/) | Spin-the-wheel decider for picking from your own options | [rolunchete.vercel.app](https://rolunchete.vercel.app) |
| [Ballsy 8](ballsy-8/) | Magic 8-ball — ask a question, get an answer | [ballsy-8.vercel.app](https://ballsy-8.vercel.app) |

---

## Examples to spark ideas

These are demos already built in this repo. Each one shows a different pattern (timers, lists, pickers, games, etc.) — feel free to ask Claude to build something similar.

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

## What the glasses are like (good to know)

You don't need to memorize this — Claude will respect these constraints automatically. But it helps when describing ideas.

- **Screen:** 600×600 pixels, single eye, transparent. Black pixels = see-through; whatever you draw "floats" on top of the world.
- **Inputs:** A D-pad with `▲ ▼ ◀ ▶` and an `Enter` button. That's it.
  - No mouse, no typing, no on-screen keyboard, no close (×) button, no Esc key.
  - Some apps also use head gestures (nod, shake) via the IMU sensor.
- **Design vibe:** Big text, high contrast, minimal chrome. Think dashboard, not website.

---

## The simulator

If you want to preview an app **without the glasses**, use [displayglasses.dev](https://displayglasses.dev) — paste any URL (yours or one from the gallery) and it'll show you how it looks layered onto a real-world background. Drag, resize, swap the background scene, all of it.

---

## Troubleshooting

**The URL works but nothing shows / it's all black.**
That's expected on the glasses — black pixels are see-through. Test in a normal browser at 600×600 (or in the [simulator](https://displayglasses.dev)) to see the actual content.

**The app needs a feature I forgot to mention.**
Just tell Claude. It remembers the conversation and will patch the existing app and redeploy.

**I want to undo Claude's last change.**
Just say *"undo that"* or *"go back to the previous version"*. Claude will rewrite the files.

**Claude says Node.js isn't installed.**
Go back to [Setup step 2](#2-install-nodejs) and run the installer from nodejs.org. After it finishes, **fully quit and reopen Claude Desktop** so it picks up the new install, then try again.

**The Vercel browser tab didn't open / I closed it by accident.**
Just tell Claude *"try deploying again"*. It'll re-open the login tab.

**I want to start over from scratch.**
Re-download a fresh ZIP of this repo and open the new folder in Claude Desktop.

---

## License

MIT. Original demos by [L+R](https://levinriegner.com). Have fun, {{NAME}}.
