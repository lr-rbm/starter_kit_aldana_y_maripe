# Template usage (maintainer notes)

This repo is the **canonical template** for personal Meta Ray-Ban Display starter kits at L+R. Each non-technical colleague gets their own playground repo (e.g. `starter_kit_roberto`, `starter_kit_valerie`) created from this template.

> This file is removed automatically by `scripts/personalize.sh`, so colleagues never see it.

## When a new colleague comes on board

Run these commands from your terminal. Replace `Valerie` with the colleague's name.

```bash
NAME="Valerie"
SLUG="$(echo "$NAME" | tr '[:upper:]' '[:lower:]')"

# 1. Create the colleague's repo from this template
gh repo create "lr-rbm/starter_kit_${SLUG}" \
  --template lr-rbm/starter_kit_template \
  --private \
  --clone

cd "starter_kit_${SLUG}"

# 2. Personalize (replaces {{NAME}} and {{SLUG}} in README + CLAUDE.md, removes itself)
./scripts/personalize.sh "$NAME"

# 3. Commit and push
git add -A
git commit -m "personalize for $NAME"
git push

# 4. Hand off — send them the zip URL
echo "Send them: https://github.com/lr-rbm/starter_kit_${SLUG}/archive/refs/heads/main.zip"
```

That's it. The colleague downloads the zip, opens the unzipped folder in Claude Desktop, and starts describing apps.

## What lives where

- `README.md` — the colleague-facing onboarding doc. Uses `{{NAME}}` and `{{SLUG}}` placeholders.
- `CLAUDE.md` — instructions for Claude Code in the colleague's session. Uses `{{NAME}}` and gender-neutral pronouns.
- `scripts/personalize.sh` — one-shot personalization script. Self-destructs after running.
- `TEMPLATE_USAGE.md` — this file. Also self-destructs.
- `.claude/` — agent configuration inherited from the upstream L+R repo. Mostly inert in colleague repos.
- `<demo-folder>/` — L+R inspiration demos. Kept as reference for Claude and as inspiration for colleagues.

## Updating the template

When you improve the template (better CLAUDE.md guidance, new inspiration demos, fix a bug in the README flow):

1. Commit the change to **this** repo (`starter_kit_template`).
2. **Existing colleague repos do NOT update automatically.** The template relationship in GitHub is creation-time only.
3. Options for propagating critical updates:
   - **Hands-off**: do nothing. New colleagues benefit; existing ones keep what they have.
   - **Manual push**: for each existing repo, cherry-pick the README/CLAUDE.md changes and push.
   - **Re-send zip**: tell the colleague to re-download the zip and copy their own app folders over. Disruptive — only worth it for breaking changes.

In practice, this repo is stable enough that drift is rare. The CLAUDE.md changes 1–2× per quarter, not per week.

## Pronouns and personalization

The template uses **gender-neutral pronouns ("they/them")** throughout `CLAUDE.md` so it works for any colleague without per-person edits. Only `{{NAME}}` and `{{SLUG}}` are substituted.

If you want to personalize pronouns per colleague, edit `CLAUDE.md` in their repo after running `personalize.sh` — but it's almost never worth it.
