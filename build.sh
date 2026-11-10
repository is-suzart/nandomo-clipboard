#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

mkdir -p dist/schemas dist/icons
pnpm --dir ../.. exec esbuild examples/clipboard-gnome/src/extension.js \
  --bundle --format=esm --target=es2022 --external:'gi://*' --external:'resource://*' \
  --outfile=examples/clipboard-gnome/dist/extension.js
pnpm --dir ../.. exec esbuild examples/clipboard-gnome/prefs.js \
  --bundle --format=esm --target=es2022 --external:'gi://*' --external:'resource://*' \
  --outfile=examples/clipboard-gnome/dist/prefs.js
cp metadata.json stylesheet.css dist/
cp icons/*.svg dist/icons/
cp vendor/LICENSE dist/KAOMOJI-LICENSE
cp schemas/*.gschema.xml dist/schemas/
glib-compile-schemas --strict dist/schemas
gnome-extensions pack --force --extra-source=KAOMOJI-LICENSE --extra-source=icons --out-dir=dist dist
