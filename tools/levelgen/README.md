# BB Gothic Dungeon Level-Generation Pipeline

A deterministic, source-controlled pipeline for authoring a two-tier Gothic labyrinth. The topology is generated in plain Python; Blender is used for the actual modular 3D scene, PBR materials, bevel treatment, and GLB export. Both stages consume the same layout contract, so the Blender model and the runtime/navigation sidecar cannot silently drift apart.

## Requirements

- Python 3.10+ (the topology and texture generator uses only the standard library).
- Blender 4.0+ with the built-in glTF 2.0 exporter enabled.
- No online asset downloads or third-party Python packages are required.

## Build

From the repository root:

```bash
./tools/levelgen/build.sh
```

Set a different deterministic seed or Blender executable when needed:

```bash
SEED=42 BLENDER_BIN=/path/to/blender ./tools/levelgen/build.sh
```

The pipeline has two independently runnable stages:

```bash
python3 tools/levelgen/generate_layout.py --out assets/levelgen --seed 8042026
blender -b --factory-startup --python tools/levelgen/build_blender_scene.py -- \
  --input assets/levelgen/dungeon-layout.json --out assets/levelgen
```

## Outputs

- `assets/levelgen/dungeon-layout.json` — seed, 5×2 room graph per tier, 9×9 room masks, global walkability, bridges, crossings, stair landings, and locked shortcut endpoints.
- `assets/levelgen/dungeon-layout.js` — compact browser copy of the same layout, used by the game to build the matching room grids.
- `assets/levelgen/bb_gothic_dungeon.glb` — optimized static level art, with joined material batches and embedded stone albedo/normal/roughness textures.
- `assets/levelgen/bb_gothic_dungeon.blend` — editable Blender source scene.
- `assets/levelgen/dungeon-runtime.json` — runtime-oriented walkable-cell, wall-collider, stair/lift and shortcut metadata. The cell size, origin and wall height match the generated scene.
- `assets/levelgen/textures/stone_{albedo,normal,roughness,ao}.png` — source PBR maps; AO is loaded by the Three.js game and bound as `aoMap` with a matching `uv2` attribute.

## Topology and geometry

The room graph starts with a spanning tree, then adds loops. Each room is a seeded backtracking maze with controlled loop carving and intentionally retained dead ends. The upper and lower layers use different room graphs. A guaranteed upper cross-gallery and a lower street beneath it create X-shaped over-under crossings, and the JSON records the corresponding bridge cells. Stair and lift landings are reserved in both masks. Shortcut candidates are chosen from initially closed room links and tagged `opens_from: far_side` for game-side gate/lever logic.

Blender builds tiled walkable surfaces, wall runs, low bridge parapets, bridge decks, Gothic ribs, stair flights and gate placeholders from those masks. Stone PBR images are packed in the `.blend` and embedded in the GLB; static mesh categories are batched into seven mesh batches for low draw-call cost. Bevel modifiers soften the architecture, and a restrained procedural displacement chips the stone-column silhouettes without sculpt-heavy geometry.

## Coordinate contract

- X/Z cell size: 6 game units.
- World origin: `(-135, -54)`.
- Room grid: 5 columns × 2 rows, each room 9 × 9 cells.
- Floor elevations: `0` and `17`.
- Wall height: `10.5`.

The runtime integration is active in location 3 (Spider Castle): the page loads the compact layout, uses its room masks for gameplay/spawns, and loads the GLB on entry. Once the GLB is ready, it replaces legacy floor/wall batches and switches wall/bridge collision to the matching generated masks; dynamic shortcut gates keep their far-side-only lever and the separate AO map is attached in Three.js. A failed GLB request leaves the procedural fallback visible.
