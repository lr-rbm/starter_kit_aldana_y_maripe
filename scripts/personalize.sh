#!/usr/bin/env bash
# Personalize a freshly-templated starter kit for a specific colleague.
#
# Usage:
#   ./scripts/personalize.sh "Valerie"
#
# What it does:
#   1. Replaces {{NAME}} → "Valerie"   (proper case, used in greetings)
#   2. Replaces {{SLUG}} → "valerie"   (lowercase, used in folder/URL refs)
#      in README.md and CLAUDE.md.
#   3. Removes itself and TEMPLATE_USAGE.md (one-shot, leaves the colleague's repo clean).
#
# Run this immediately after cloning the new repo from the template,
# then `git add -A && git commit -m "personalize for $NAME" && git push`.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <Name>" >&2
  echo "Example: $0 Valerie" >&2
  exit 1
fi

NAME="$1"
SLUG="$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')"

if [[ -z "$SLUG" ]]; then
  echo "Error: name '$NAME' produced an empty slug. Use letters/digits/hyphens." >&2
  exit 1
fi

# BSD sed (macOS) vs GNU sed (Linux) compatibility
if sed --version >/dev/null 2>&1; then
  sed_inplace() { sed -i "$@"; }
else
  sed_inplace() { sed -i '' "$@"; }
fi

for f in README.md CLAUDE.md; do
  if [[ ! -f "$f" ]]; then
    echo "Warning: $f not found, skipping." >&2
    continue
  fi
  sed_inplace "s/{{NAME}}/$NAME/g" "$f"
  sed_inplace "s/{{SLUG}}/$SLUG/g" "$f"
done

# Self-destruct: this script and the maintainer doc are no longer needed.
rm -f TEMPLATE_USAGE.md
rm -- "$0"
# scripts/ may be empty now — clean it up too
rmdir scripts 2>/dev/null || true

echo "Personalized for $NAME (slug: $SLUG)."
echo "Next: git add -A && git commit -m 'personalize for $NAME' && git push"
