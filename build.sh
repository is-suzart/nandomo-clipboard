#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

source_dir="$PWD"
nandomo_dir=$(cd "${NANDOMO_DIR:-../nandomo}" && pwd)
core="$nandomo_dir/packages/core/src/index.ts"
mkdir -p dist/schemas dist/icons
pnpm --dir "$nandomo_dir" exec esbuild "$source_dir/src/extension.js" "$source_dir/prefs.js" \
  --bundle --format=esm --target=es2022 --external:'gi://*' --external:'resource://*' \
  --alias:"@nandomo/core=$core" --outbase="$source_dir" --outdir="$source_dir/dist"
mv dist/src/extension.js dist/extension.js
rmdir dist/src
cp metadata.json stylesheet.css LICENSE NANDOMO-CORE-NOTICE dist/
cp icons/*.svg dist/icons/
cp vendor/LICENSE dist/KAOMOJI-LICENSE
cp vendor/UNICODE-LICENSE dist/
cp schemas/*.gschema.xml dist/schemas/
glib-compile-schemas --strict dist/schemas
gnome-extensions pack --force --extra-source=icons --extra-source=LICENSE \
  --extra-source=NANDOMO-CORE-NOTICE --extra-source=KAOMOJI-LICENSE \
  --extra-source=UNICODE-LICENSE --out-dir=dist dist
