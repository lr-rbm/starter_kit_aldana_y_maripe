# CLAUDE.md

Project instructions for Claude Code (and any other coding agent) working in this repo.

> **Keep this file short and up to date.** As the repo evolves, update the relevant sections and remove anything that no longer applies. Outdated or bloated instructions are worse than none — agents will follow them literally.

## Who you're working with

The user is **{{NAME}}**: **non-technical**, possibly on **macOS or Windows**. They don't know what Vercel, git, npm, Node.js, a CLI, or PowerShell are. Treat every interaction with that in mind.

- **Plain language only.** No jargon. If you have to use a term, define it in one short clause.
- **No code in chat.** They're not going to read it. Show results, not source.
- **One outcome per response:** the URL. Build → deploy → reply with the production URL. Don't explain the file structure, don't summarize the diff.
- **No "next steps" lists.** No "if you want to do X, run Y". They'll ask for the next thing in plain English. Don't pre-empt.
- **No commands for them to paste.** You run the commands via your tools. The only manual step they'll ever do is double-click a GUI installer (and even that, only if Node.js is missing).
- **Errors:** if something fails, fix it yourself. If you truly can't, explain in one sentence what's wrong and what they need to do. Never give them a debugging task.

### Jargon → plain language

When you must mention these terms in chat, prefer the plain-language version:

| Don't say | Say |
|---|---|
| "I'll run `npm install` / `npx vercel`" | "I'll get your app online" |
| "deploy to production" | "put your app online" |
| "Vercel" | "Vercel (the service that hosts your app online)" — first mention only; just "Vercel" after that |
| "git commit" / "git diff" | (don't mention — there is no git) |
| "the CLI" / "Terminal" | (don't mention — you use those, they don't) |
| "Node.js isn't on `PATH`" | "Node.js doesn't seem to be installed yet" |
| "404 / 500 / stack trace" | the human meaning of what failed |
| pasted command output, stack traces, file diffs | a one-sentence summary of what happened |

## What this repo is

A collection of **self-contained web demos for the [Meta Ray-Ban Display glasses](https://wearables.developer.meta.com/docs)**. Each demo is a tiny vanilla HTML/CSS/JS app designed for a **600×600 lens** driven by a **D-pad** (no mouse, no on-screen keyboard).

The repo is a personal starter kit derived from L+R's open-source collection. {{NAME}} uses it as a playground: existing demos serve as inspiration; their own apps land as new folders.

## Environment assumptions

{{NAME}} downloaded this repo as a **ZIP file**, unzipped it, and opened the folder in Claude Desktop. Concretely:

- **They might be on macOS or Windows.** Detect platform before suggesting any platform-specific action. Quick check from inside Bash:
  ```bash
  uname -s 2>/dev/null || echo "Windows"
  ```
  `Darwin` → macOS. Anything else (no `uname`, or "Windows" fallback) → Windows. Don't assume — actually run the check on first deploy.
- **No git.** The folder is not a git repo. `.git/` does not exist. Do **not** run `git init`, `git status`, `git log`, `git commit`, `git diff`, or any other git command. If you need to track what you've changed, rely on your own tool-call history in the conversation. {{NAME}} does not have git installed and does not need it.
- **No Vercel CLI installed globally.** Use `npx vercel@latest` (not `vercel`). The first invocation will download the package on the fly.
- **No package managers (Homebrew, winget, Chocolatey) assumed.** Don't suggest `brew install …` or `winget install …`. {{NAME}} probably doesn't have those, and installing them is more friction than the GUI installer paths below.
- **Node.js *should* be installed** (the README walks {{NAME}} through it before they get here), but verify before deploying — see "Missing Node.js" below.
- **The user is not in Terminal.** They're chatting with you in Claude Desktop. Don't ask them to paste commands. The only command they might ever need to run is the deploy command — and you run it for them.

## The default workflow — build + deploy + return a URL

When {{NAME}} asks for a new app, the full flow is:

1. **Build it.** Write the files in a new folder at the repo root: `<app-name>/index.html`, `styles.css`, `app.js`, and a `favicon.svg` if appropriate. Folder name is lowercase kebab-case.
2. **Deploy it to Vercel.** From the app folder, run:
   ```bash
   cd <app-name> && npx vercel@latest --prod --yes
   ```
   - `npx` runs Vercel CLI without a global install.
   - `--yes` accepts all defaults (creates a new project on first deploy, named after the folder, under {{NAME}}'s personal scope).
   - `--prod` deploys straight to production.
3. **Reply with the production URL only.** One line is enough:
   > Done — your app is live at https://&lt;the-url-vercel-returned&gt;

   Parse the URL from `vercel` stdout (it's printed on the last line, prefixed with `Production:` or similar). Don't paste the whole CLI output back to {{NAME}}.

### Handling first-time deploys (not logged in to Vercel)

The first time `npx vercel ...` runs on a fresh machine, it'll fail with a message like *"Please log in"* or *"No existing credentials found"*. When that happens:

1. **Tell {{NAME}}, in one sentence, what's about to happen:**
   > One sec — I'm opening a browser tab so you can log in to Vercel. Sign up for the free Hobby plan, then close the tab and I'll keep going.
2. **Run `npx vercel@latest login`.** This opens the browser; {{NAME}} authorizes; CLI returns success.
3. **Retry the deploy command** from step 2 of the main flow.

Do this without asking {{NAME}}'s permission — it's part of the normal first-run flow, and the README warned them.

### Other failure cases

#### Missing Node.js

Detect by running `node --version` (or `npx --version`). If it exits non-zero / "command not found":

1. Detect OS with `uname -s` (Darwin = Mac, anything else = Windows).
2. Try to **open the download page in {{NAME}}'s browser** for them:
   - **macOS**: `open https://nodejs.org/`
   - **Windows**: `start https://nodejs.org/` (or `cmd /c start https://nodejs.org/`)
3. Tell {{NAME}} in plain English, adapted to their OS. Sample script:

   > Quick — I need Node.js installed before I can put your app online. I just opened nodejs.org in your browser. Click the big green **LTS** button, then double-click the file that downloads (it'll be a `.pkg` on Mac or `.msi` on Windows). Click through the installer with the defaults — should take 30 seconds.
   >
   > Then **fully quit Claude Desktop and reopen it** (so it sees the new install), come back to this chat, and tell me "done" — I'll pick up where we left off.

4. **Do not try to install Node.js for them via Homebrew, winget, Chocolatey, or any package manager.** Those need admin passwords, terminal interaction, and often a package-manager install first. The GUI installer is faster and friendlier.
5. Note about the **restart**: a freshly-installed Node.js won't appear on `PATH` for an already-running shell. Claude Desktop must be restarted for the embedded shell to find `node`. Always include the restart instruction.

#### Vercel returns an error mid-deploy

(out of quota, name collision, network, etc.)

- Fix what you can yourself — e.g., if Vercel says the project name is taken, rename the local folder and retry.
- Otherwise surface the actual error in plain language ("Vercel says your free quota is full for this month — you can upgrade or wait until next month"). Don't paste the raw stack trace.

#### `--yes` doesn't cover a prompt

Rare. Usually only happens if {{NAME}}'s Vercel account belongs to a team with multiple scopes. Surface in plain language:

> Vercel's asking which account to deploy under — I'll pick your personal one.

Then re-run with the `--scope` flag set to their personal scope.

### What NOT to do

- **Don't run `npx serve`** or any local dev server. Don't print `localhost` URLs. {{NAME}} wants a real URL they can open on their phone, in the simulator, or on the glasses.
- **Don't generate screenshots.** Don't drive headless Chrome. That's a developer tool — {{NAME}} doesn't need them.
- **Don't commit anything.** No git, ever — see "Environment assumptions" above.
- **Don't show CLI output, stack traces, or file diffs in chat.** {{NAME}} won't read them. State the result.

## Hardware constraints — read before designing UI

- **Display:** 600×600, single eye, additive (transparent) — anything you draw will sit on top of the world. Prefer pure `#000` backgrounds; black = transparent on the lens.
- **Inputs available on the device:**
  - D-pad: `▲ ▼ ◀ ▶`
  - `Enter` (primary action)
  - Touchpad swipes (mirrored to the arrow keys in apps that support gestures)
  - Optional: head-gesture / IMU (used by `head-gesture-prototype`, `metronome` NOD)
- **Inputs that DO NOT exist on the device — never document them as controls or wire them up:**
  - `Esc` key
  - Mouse / tap-to-click on UI
  - On-screen keyboard / typing
  - A "×" close button
- Pick-from-list, wheel-pickers, and digit carousels are the idiomatic replacement for typing.

## Repo layout

```
<repo-root>/
├── README.md                # {{NAME}}-facing onboarding doc
├── CLAUDE.md                # this file
├── LICENSE
└── <app-name>/              # one folder per demo
    ├── index.html
    ├── styles.css
    ├── app.js
    └── favicon.svg          # optional
```

A folder at the root is **a demo** if it contains `index.html`. Anything else (`.git`, `.claude`, hidden files, this `CLAUDE.md`) is not a demo.

## Per-app conventions

- **Vanilla only.** No bundler, no framework, no build step, no `package.json` inside an app folder. The app must run by pointing a browser at a static URL.
- **Fonts:** load from Google Fonts. The house pair is `Space Grotesk` + `JetBrains Mono` — don't change it without a reason.
- **Background:** prefer pure `#000`. Avoid ambient gradients on the lens.
- **Favicon:** SVG when possible, themed to the app's accent color.
- **Folder name:** lowercase kebab-case, matches the app's intent (`tip-calculator`, `dice-roller`, `chuck-jokes`).
- **No analytics.** Do **not** include the Umami `<script defer src="https://cloud.umami.is/script.js" data-website-id="...">` tag in apps you build for {{NAME}}. That tag belongs to L+R's analytics account in the upstream repo. {{NAME}}'s apps are personal — they don't send telemetry anywhere.

## Iteration

When {{NAME}} asks for a change to an existing app:

1. Edit the files in place.
2. Re-deploy from that app's folder with `cd <app-name> && npx vercel@latest --prod --yes`. The folder is already linked from the first deploy, so Vercel reuses the same project — the production URL stays stable.
3. Reply with the URL.

When {{NAME}} asks to **undo** a change, just rewrite the files back to what they were (use your conversation history). There's no git to roll back to.

## When in doubt about design

Mirror an existing, recently-built demo. Good references:

- `flight-status/` — clean info dashboard, picker patterns
- `lr-glimmer/` — multi-state app with state machine
- `dad-jokes/` — minimalist single-screen app with audio
- `metronome/` — head-gesture (NOD) integration
- `zork-terminal/` — text-heavy app, CRT styling
- `tally-counter/` — single-button utility

## Things to avoid (have caused churn historically)

- Documenting `Esc` / `×` / tap / typing inputs in any README or wiring them up in code — the hardware has none.
- Ambient gradients behind content on the lens — they bleach against the world.
- Suggesting Chrome / headless-Chrome / dev servers as something {{NAME}} needs to run. They don't.
- Introducing build tools or `package.json` to an app folder. Stay vanilla.
- Adding the L+R Umami analytics tag to {{NAME}}'s apps.

## Top-level README

The top-level `README.md` is **{{NAME}}'s onboarding doc**, not an index of their apps. Don't auto-update it when adding a new app folder. If they ask you to add their new app to the README's example gallery, do that — otherwise leave it alone.

(The `.claude/agents/readme-sync.md` subagent from the upstream repo is no longer relevant here. Do not invoke it. There's also no git in this repo, so it would fail anyway.)
