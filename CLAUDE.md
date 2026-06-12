# CLAUDE.md

Project instructions for Claude Code (and any other coding agent) working in this repo.

> **Keep this file short and up to date.** As the repo evolves, update the relevant sections and remove anything that no longer applies. Outdated or bloated instructions are worse than none — agents will follow them literally.

## What this repo is

A personal collection of **self-contained web apps for the [Meta Ray-Ban Display glasses](https://wearables.developer.meta.com/docs)**, built on top of L+R's open-source demos starter template. Each app is a tiny vanilla HTML/CSS/JS app designed for a **600×600 lens** driven by a **D-pad** (no mouse, no on-screen keyboard).

The template's demos serve as reference and inspiration; Aldana & MP's own apps land as new folders at the root. The top-level [`README.md`](README.md) tracks our apps (top table) and lists the template demos (bottom).

## Who you're working with

A **developer** comfortable with git, the CLI, npm/npx, and Vercel. Work like a peer:

- Show code, diffs, and command output when relevant. Don't hide the details.
- Use git normally — commit, diff, branch, status. Commit only when asked; never push without being asked.
- Use the local preview server and screenshots to verify changes — that's expected, not off-limits.
- When something is a judgment call, recommend the right option rather than listing every alternative.

## The default workflow — build, verify, deploy

1. **Build it.** Write the files in a new folder at the repo root: `<app-name>/index.html`, `styles.css`, `app.js`, and a `favicon.svg` if appropriate. Folder name is lowercase kebab-case.
2. **Verify it.** Use the preview server (`.claude/launch.json` has per-app entries) and screenshots/console checks to confirm it works before deploying. Note: the static preview server does **not** run Vercel serverless functions (anything under an app's `api/` folder) — verify those against the deployed URL.
3. **Deploy to Vercel** from the app folder:
   ```bash
   cd <app-name> && npx vercel@latest --prod --yes
   ```
   First deploy creates and links the project (named after the folder); later deploys reuse it, so the production URL stays stable.
4. **Reply with the production URL.**

### Iteration

1. Edit the files in place.
2. Re-deploy from the app's folder with `cd <app-name> && npx vercel@latest --prod --yes`.
3. Reply with the URL.

To undo, prefer git (`git restore`, `git revert`) when the change is committed; otherwise rewrite the files.

## Hardware constraints — read before designing UI

- **Display:** 600×600, single eye, additive (transparent) — anything you draw sits on top of the world. Prefer pure `#000` backgrounds; black = transparent on the lens.
- **Inputs available on the device:**
  - D-pad: `▲ ▼ ◀ ▶`
  - `Enter` (primary action)
  - Touchpad swipes (mirrored to the arrow keys in apps that support gestures)
  - Optional: head-gesture / IMU (used by `head-gesture-prototype`, `metronome` NOD)
- **Inputs that DO NOT exist on the device — never document them as controls or rely on them:**
  - `Esc` key
  - On-screen keyboard / typing
  - A "×" close button
  - Mouse / tap-to-click — *for the glasses*. Mouse handlers are fine as an **additive** convenience for web/simulator use, as long as every action also works from the D-pad.
- Pick-from-list, wheel-pickers, and digit carousels are the idiomatic replacement for typing.

## Repo layout

```
<repo-root>/
├── README.md                # repo overview: our apps + template demos
├── CLAUDE.md                # this file
├── LICENSE
├── .claude/                 # Claude Code config (launch.json for previews, etc.)
└── <app-name>/              # one folder per app
    ├── index.html
    ├── styles.css
    ├── app.js
    ├── favicon.svg          # optional
    └── api/                 # optional Vercel serverless functions
```

A folder at the root is **an app** if it contains `index.html`. Anything else (`.claude`, hidden files, this `CLAUDE.md`) is not.

## Per-app conventions

- **Vanilla only.** No bundler, no framework, no build step, no `package.json` inside an app folder. The app runs by pointing a browser at static files. (Serverless functions under `api/` are the one server-side exception, e.g. to proxy an http-only API.)
- **Fonts:** load from Google Fonts. The house pair is `Space Grotesk` + `JetBrains Mono` — don't change it without a reason.
- **Background:** prefer pure `#000`. Avoid ambient gradients on the lens — they bleach against the world.
- **Favicon:** SVG when possible, themed to the app's accent color.
- **Folder name:** lowercase kebab-case, matching the app's intent (`quick-timer`, `humans-in-space`).
- **No analytics.** Do **not** add the L+R Umami `<script defer src="https://cloud.umami.is/script.js" ...>` tag. That belongs to L+R's account in the upstream template — these apps are personal and send no telemetry.

## When in doubt about design

Mirror an existing, well-built app. Good references:

- `humans-in-space/` — live data, loading/error states, serverless proxy, mouse+D-pad controls
- `flight-status/` — clean info dashboard, picker patterns
- `lr-glimmer/` — multi-state app with a state machine
- `dad-jokes/` — minimalist single-screen app with audio
- `metronome/` — head-gesture (NOD) integration
- `zork-terminal/` — text-heavy app, CRT styling

## Things to avoid (have caused churn historically)

- Documenting `Esc` / `×` / typing inputs as controls, or building UI that *only* works with a mouse — the hardware has none.
- Ambient gradients behind content on the lens.
- Introducing build tools or `package.json` to an app folder. Stay vanilla.
- Adding the L+R Umami analytics tag.

## Top-level README

The top table of [`README.md`](README.md) is our index of apps — keep it in sync when adding, removing, or renaming an app. Leave the template-demo tables below it alone unless asked.
