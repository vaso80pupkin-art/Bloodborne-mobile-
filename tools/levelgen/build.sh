#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SEED="${SEED:-8042026}"
BLENDER_BIN="${BLENDER_BIN:-blender}"
OUT="$ROOT/assets/levelgen"
if ! command -v "$BLENDER_BIN" >/dev/null 2>&1; then
  echo "Blender CLI not found. Install Blender 4.x or set BLENDER_BIN." >&2
  exit 2
fi
python3 "$ROOT/tools/levelgen/generate_layout.py" --out "$OUT" --seed "$SEED"
"$BLENDER_BIN" -b --factory-startup --python "$ROOT/tools/levelgen/build_blender_scene.py" -- \
  --input "$OUT/dungeon-layout.json" --out "$OUT"
python3 "$ROOT/tools/levelgen/validate_export.py" "$OUT"
