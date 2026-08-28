#!/usr/bin/env bash
set -euo pipefail

SOURCE="$HOME/project/PythonProject/Project-OmniGuard/standalone"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -d "$SOURCE" ]]; then
  echo "error: source not found: $SOURCE" >&2
  exit 1
fi

rm -rf "$REPO/aiapp" "$REPO/prediction"

rsync -a --exclude 'Makefile' "$SOURCE/" "$REPO/"

# promote dist output to module root so the root index.html relative refs
# (./aiapp.js, ./prediction.js, ./prediction.css) resolve correctly
cp "$REPO/aiapp/dist/index.html" "$REPO/aiapp/index.html"
cp "$REPO/aiapp/dist/aiapp.js" "$REPO/aiapp/aiapp.js"
cp "$REPO/prediction/dist/index.html" "$REPO/prediction/index.html"
cp "$REPO/prediction/dist/prediction.js" "$REPO/prediction/prediction.js"
cp "$REPO/prediction/dist/prediction.css" "$REPO/prediction/prediction.css"

echo "copied to $REPO:"
ls -d "$REPO"/aiapp "$REPO"/prediction

cd "$REPO"
if git diff --quiet; then
  echo "no changes to commit"
else
  git add -A
  git commit -m "chore: update standalone (aiapp, prediction)"
  git push origin main
  echo "pushed, GitHub Actions will redeploy"
fi
