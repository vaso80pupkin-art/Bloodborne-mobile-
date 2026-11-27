#!/usr/bin/env python3
"""Generate a deterministic two-tier Gothic dungeon layout and PBR texture set."""
from __future__ import annotations

import argparse
import json
import math
import random
import struct
import zlib
from pathlib import Path

SEED_DEFAULT = 8042026
ROOM_COLS, ROOM_ROWS, ROOM_SIZE = 5, 2, 9
CELL = 6.0
FLOOR_Y = [0.0, 17.0]
WALL_HEIGHT = 10.5
WIDTH, DEPTH = ROOM_COLS * ROOM_SIZE, ROOM_ROWS * ROOM_SIZE


def png_rgb(path: Path, width: int, height: int, pixels: bytearray, channels: int = 3) -> None:
    def chunk(tag: bytes, payload: bytes) -> bytes:
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
    stride = width * channels
    raw = b"".join(b"\x00" + pixels[y * stride:(y + 1) * stride] for y in range(height))
    data = b"\x89PNG\r\n\x1a\n"
    data += chunk(b"IHDR", struct.pack(">2I5B", width, height, 8, 2 if channels == 3 else 0, 0, 0, 0))
    data += chunk(b"IDAT", zlib.compress(raw, 8))
    data += chunk(b"IEND", b"")
    path.write_bytes(data)


def make_pbr_textures(out: Path, size: int = 256) -> None:
    """Create seamless stone albedo, tangent-space normal, roughness and AO maps."""
    albedo = bytearray(size * size * 3)
    rough = bytearray(size * size * 3)
    ao = bytearray(size * size * 3)
    heights = [0.0] * (size * size)
    for y in range(size):
        for x in range(size):
            i = y * size + x
            # Repeating dressed-stone courses, with granular and low-frequency variation.
            seam_x = min(x % 64, 64 - (x % 64))
            seam_y = min(y % 32, 32 - (y % 32))
            seam = 0.0 if seam_x < 2 or seam_y < 2 else 1.0
            n = (math.sin(x * 0.173 + math.sin(y * 0.043) * 3.1) + math.sin(y * 0.227 + x * 0.021) + math.sin((x + y) * 0.071)) / 6.0
            grain = math.sin(x * 1.71 + y * 2.13) * math.sin(y * 1.29 - x * 0.91) * 0.045
            h = 0.5 + n * 0.52 + grain
            heights[i] = h * seam
            shade = int(max(0, min(255, 74 + 28 * n + 16 * grain - (24 if seam == 0 else 0))))
            albedo[i * 3:i * 3 + 3] = bytes((shade, max(0, shade - 4), max(0, shade - 1)))
            rv = int(max(0, min(255, 205 + 16 * math.sin(x * 0.37 + y * 0.23) - (20 if seam == 0 else 0))))
            rough[i * 3:i * 3 + 3] = bytes((rv, rv, rv))
            av = int(max(0, min(255, 244 - (92 if seam == 0 else 0) - max(0, 12 - min(seam_x, seam_y) * 4))))
            ao[i * 3:i * 3 + 3] = bytes((av, av, av))
    normal = bytearray(size * size * 3)
    for y in range(size):
        ym, yp = (y - 1) % size, (y + 1) % size
        for x in range(size):
            xm, xp = (x - 1) % size, (x + 1) % size
            i = y * size + x
            dx = (heights[y * size + xp] - heights[y * size + xm]) * 4.0
            dy = (heights[yp * size + x] - heights[ym * size + x]) * 4.0
            nx, ny, nz = -dx, -dy, 1.0
            length = math.sqrt(nx * nx + ny * ny + nz * nz)
            normal[i * 3:i * 3 + 3] = bytes(int(max(0, min(255, round((v / length * 0.5 + 0.5) * 255)))) for v in (nx, ny, nz))
    png_rgb(out / "stone_albedo.png", size, size, albedo)
    png_rgb(out / "stone_normal.png", size, size, normal)
    png_rgb(out / "stone_roughness.png", size, size, rough)
    png_rgb(out / "stone_ao.png", size, size, ao)


def carve(grid: list[list[int]], x: int, z: int) -> None:
    if 0 <= z < len(grid) and 0 <= x < len(grid[0]):
        grid[z][x] = 0


def carve_l(grid: list[list[int]], a: tuple[int, int], b: tuple[int, int], rng: random.Random) -> None:
    x, z = a
    x2, z2 = b
    axes = [0, 1]
    rng.shuffle(axes)
    for axis in axes:
        if axis == 0:
            while x != x2:
                carve(grid, x, z)
                x += 1 if x2 > x else -1
        else:
            while z != z2:
                carve(grid, x, z)
                z += 1 if z2 > z else -1
    carve(grid, x2, z2)


def room_maze(seed: int) -> list[list[int]]:
    rng = random.Random(seed)
    g = [[1] * ROOM_SIZE for _ in range(ROOM_SIZE)]
    start = (1, 1)
    stack = [start]
    g[start[1]][start[0]] = 0
    while stack:
        x, z = stack[-1]
        dirs = [(x + 2, z), (x - 2, z), (x, z + 2), (x, z - 2)]
        rng.shuffle(dirs)
        nxt = next(((nx, nz) for nx, nz in dirs if 1 <= nx < ROOM_SIZE - 1 and 1 <= nz < ROOM_SIZE - 1 and g[nz][nx]), None)
        if nxt is None:
            stack.pop()
            continue
        nx, nz = nxt
        g[(z + nz) // 2][(x + nx) // 2] = 0
        g[nz][nx] = 0
        stack.append(nxt)
    # Add controlled cycles without erasing the characteristic dead ends.
    for z in range(1, ROOM_SIZE - 1):
        for x in range(1, ROOM_SIZE - 1):
            if g[z][x] and rng.random() < 0.12:
                open_n = sum(1 for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)) if g[z + dz][x + dx] == 0)
                if open_n >= 2:
                    g[z][x] = 0
    return g


def room_edges(seed: int) -> set[tuple[int, int]]:
    """Spanning-tree room graph plus nonadjacent-feeling loops on the 5x2 lattice."""
    rng = random.Random(seed)
    adj: dict[int, list[int]] = {i: [] for i in range(ROOM_COLS * ROOM_ROWS)}
    for r in range(ROOM_ROWS):
        for c in range(ROOM_COLS):
            i = r * ROOM_COLS + c
            if c + 1 < ROOM_COLS:
                adj[i].append(i + 1)
            if r + 1 < ROOM_ROWS:
                adj[i].append(i + ROOM_COLS)
    seen = {0}
    stack = [0]
    tree: set[tuple[int, int]] = set()
    while stack:
        node = stack[-1]
        choices = [n for n in adj[node] if n not in seen]
        if not choices:
            stack.pop()
            continue
        nxt = rng.choice(choices)
        seen.add(nxt)
        stack.append(nxt)
        tree.add(tuple(sorted((node, nxt))))
    candidates = [tuple(sorted((i, n))) for i, ns in adj.items() for n in ns if (tuple(sorted((i, n))) not in tree)]
    rng.shuffle(candidates)
    tree.update(candidates[:3])
    return tree


def build_layout(seed: int) -> dict:
    all_rooms = []
    layers = []
    room_graphs = []
    for floor in range(2):
        graph = room_edges(seed + floor * 1009)
        room_graphs.append(graph)
        rooms = []
        global_grid = [[1] * WIDTH for _ in range(DEPTH)]
        for room_id in range(ROOM_COLS * ROOM_ROWS):
            maze = room_maze(seed + floor * 50021 + room_id * 97)
            if floor == 0 and room_id == 0:
                for z in range(1, ROOM_SIZE - 1):
                    for x in range(1, ROOM_SIZE - 1):
                        carve(maze, x, z)
            if floor == 1 and room_id == ROOM_COLS * ROOM_ROWS - 1:
                for z in range(ROOM_SIZE // 2 - 2, ROOM_SIZE // 2 + 3):
                    for x in range(ROOM_SIZE // 2 - 2, ROOM_SIZE // 2 + 3):
                        carve(maze, x, z)
                for x in range(1, ROOM_SIZE // 2 + 1):
                    carve(maze, x, ROOM_SIZE // 2)
            # Connect room center to the portals selected by the room graph.
            row, col = divmod(room_id, ROOM_COLS)
            portals = []
            for a, b in sorted(graph):
                if a != room_id and b != room_id:
                    continue
                other = b if a == room_id else a
                orow, ocol = divmod(other, ROOM_COLS)
                if ocol > col:
                    portals.append((ROOM_SIZE - 1, ROOM_SIZE // 2))
                elif ocol < col:
                    portals.append((0, ROOM_SIZE // 2))
                elif orow > row:
                    portals.append((ROOM_SIZE // 2, ROOM_SIZE - 1))
                else:
                    portals.append((ROOM_SIZE // 2, 0))
            rng = random.Random(seed + floor * 7919 + room_id * 389)
            for p in portals:
                carve_l(maze, (ROOM_SIZE // 2, ROOM_SIZE // 2), p, rng)
            # Reserved landings for three staircases and the service lift.
            stair_rooms = {2: (4, 2, 4, 6), 5: (4, 2, 4, 6), 4: (4, 2, 4, 6)}
            if room_id in stair_rooms:
                x0, z0, x1, z1 = stair_rooms[room_id]
                for zz in range(z0, z1 + 1):
                    carve(maze, x0, zz)
            if room_id == 8:
                carve(maze, 4, 4)
            for z in range(ROOM_SIZE):
                for x in range(ROOM_SIZE):
                    global_grid[row * ROOM_SIZE + z][col * ROOM_SIZE + x] = maze[z][x]
            rooms.append({"room": room_id, "row": row, "col": col, "grid": maze})
        # Carve the selected graph edges through the room-boundary cells.
        for a, b in graph:
            ar, ac = divmod(a, ROOM_COLS)
            br, bc = divmod(b, ROOM_COLS)
            if bc > ac:
                gx, gz = (ac + 1) * ROOM_SIZE - 1, ar * ROOM_SIZE + ROOM_SIZE // 2
                carve(global_grid, gx, gz); carve(global_grid, gx + 1, gz)
            elif bc < ac:
                gx, gz = ac * ROOM_SIZE, ar * ROOM_SIZE + ROOM_SIZE // 2
                carve(global_grid, gx, gz); carve(global_grid, gx - 1, gz)
            elif br > ar:
                gx, gz = ac * ROOM_SIZE + ROOM_SIZE // 2, (ar + 1) * ROOM_SIZE - 1
                carve(global_grid, gx, gz); carve(global_grid, gx, gz + 1)
            else:
                gx, gz = ac * ROOM_SIZE + ROOM_SIZE // 2, ar * ROOM_SIZE
                carve(global_grid, gx, gz); carve(global_grid, gx, gz - 1)
        layers.append({"index": floor, "y": FLOOR_Y[floor], "grid": global_grid, "room_graph": [list(e) for e in sorted(graph)]})
        all_rooms.append(rooms)

    # Ensure the two levels have intentional, visible over-under crossings.
    lower, upper = layers[0]["grid"], layers[1]["grid"]
    for x in range(1, WIDTH - 1):
        carve(upper, x, 8)
        carve(lower, x, 8)
    for z in range(1, DEPTH - 1):
        carve(upper, WIDTH // 2, z)
        carve(lower, WIDTH // 2, z)
    # Guaranteed stair and lift landings in both floors.
    stair_xy = [
        (ROOM_SIZE * 2 + ROOM_SIZE // 2, 2),
        (ROOM_SIZE // 2, ROOM_SIZE + 2),
        (ROOM_SIZE * 4 + ROOM_SIZE // 2, 2),
    ]
    for x, z in stair_xy:
        for zz in range(z, min(DEPTH, z + 6)):
            carve(lower, x, zz); carve(upper, x, zz)
    lift = (ROOM_SIZE * 3 + ROOM_SIZE // 2, ROOM_SIZE + ROOM_SIZE // 2)
    for grid in (lower, upper):
        for z in range(lift[1] - 1, lift[1] + 2):
            for x in range(lift[0] - 1, lift[0] + 2):
                carve(grid, x, z)

    # Reserve one closed-by-default shortcut per tier. Its floor is present,
    # while a separate gate collider keeps the passage locked until interaction.
    shortcut_candidates = []
    for floor, graph in enumerate(room_graphs):
        possible = []
        for r in range(ROOM_ROWS):
            for c in range(ROOM_COLS):
                a = r * ROOM_COLS + c
                if c + 1 < ROOM_COLS:
                    b = a + 1
                    if tuple(sorted((a, b))) not in graph:
                        possible.append((a, b, "east"))
                if r + 1 < ROOM_ROWS:
                    b = a + ROOM_COLS
                    if tuple(sorted((a, b))) not in graph:
                        possible.append((a, b, "south"))
        if possible:
            a, b, side = possible[0]
            row, col = divmod(a, ROOM_COLS)
            if side == "east":
                gate_x = (col + 1) * ROOM_SIZE
                gate_z = row * ROOM_SIZE + ROOM_SIZE // 2
                carve_l(layers[floor]["grid"], (col * ROOM_SIZE + ROOM_SIZE // 2, gate_z), (gate_x - 1, gate_z), random.Random(seed + floor * 31 + a))
                carve_l(layers[floor]["grid"], (gate_x + ROOM_SIZE // 2, gate_z), (gate_x, gate_z), random.Random(seed + floor * 47 + b))
                world_x, world_z, axis = -135.0 + gate_x * CELL, -54.0 + (gate_z + 0.5) * CELL, "x"
            else:
                gate_x = col * ROOM_SIZE + ROOM_SIZE // 2
                gate_z = (row + 1) * ROOM_SIZE
                carve_l(layers[floor]["grid"], (gate_x, row * ROOM_SIZE + ROOM_SIZE // 2), (gate_x, gate_z - 1), random.Random(seed + floor * 31 + a))
                carve_l(layers[floor]["grid"], (gate_x, gate_z + ROOM_SIZE // 2), (gate_x, gate_z), random.Random(seed + floor * 47 + b))
                world_x, world_z, axis = -135.0 + (gate_x + 0.5) * CELL, -54.0 + gate_z * CELL, "z"
            shortcut_candidates.append({
                "id": f"shortcut_f{floor}", "floor": floor, "rooms": [a, b], "side": side,
                "locked": True, "opens_from": "far_side", "axis": axis,
                "grid_x": gate_x, "grid_z": gate_z,
                "world_x": world_x, "world_z": world_z,
            })

    # Write the final global edits back into the per-room grids, so Blender and runtime agree.
    for floor in range(2):
        for room in all_rooms[floor]:
            r, c = room["row"], room["col"]
            room["grid"] = [layers[floor]["grid"][r * ROOM_SIZE + z][c * ROOM_SIZE:(c + 1) * ROOM_SIZE] for z in range(ROOM_SIZE)]

    # Bridge route on the upper tier; the lower-tier cross route runs beneath it.
    bridge_cells = [[x, 8] for x in range(1, WIDTH - 1)]
    crossing_cells = [[WIDTH // 2, 8]]
    # The additional route crossing forms a readable X from viewpoints in the galleries.
    bridge_cells += [[WIDTH // 2, z] for z in range(2, DEPTH - 2)]
    bridge_cells = sorted({tuple(p) for p in bridge_cells})
    dead_ends = []
    for floor, layer in enumerate(layers):
        grid = layer["grid"]
        for z in range(1, DEPTH - 1):
            for x in range(1, WIDTH - 1):
                if grid[z][x] == 0:
                    degree = sum(grid[z + dz][x + dx] == 0 for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                    if degree == 1:
                        dead_ends.append([floor, x, z])

    for floor, layer in enumerate(layers):
        walkable = {(x, z) for z, row in enumerate(layer["grid"]) for x, v in enumerate(row) if v == 0}
        if not walkable:
            raise ValueError(f"floor {floor} has no walkable cells")
        todo = [next(iter(walkable))]
        reached = {todo[0]}
        while todo:
            x, z = todo.pop()
            for nxt in ((x + 1, z), (x - 1, z), (x, z + 1), (x, z - 1)):
                if nxt in walkable and nxt not in reached:
                    reached.add(nxt)
                    todo.append(nxt)
        if reached != walkable:
            raise ValueError(f"floor {floor} has {len(walkable - reached)} unreachable walkable cells")
    for stair in stair_xy:
        if any(layers[f]["grid"][stair[1]][stair[0]] != 0 for f in (0, 1)):
            raise ValueError(f"stair landing {stair} is not walkable on both tiers")
    staircases = []
    for i, (x, z) in enumerate(stair_xy):
        staircases.append({"id": f"stair_{i+1}", "x": (x + 0.5) * CELL - 135.0, "z": z * CELL - 54.0, "lower_y": 0.0, "upper_y": 17.0, "run": 28.0, "width": 4.8, "axis": "z"})
    return {
        "schema": "bb-dungeon-layout/1", "seed": seed,
        "world": {"origin_x": -135.0, "origin_z": -54.0, "cell_size": CELL, "width_cells": WIDTH, "depth_cells": DEPTH, "room_cols": ROOM_COLS, "room_rows": ROOM_ROWS, "room_size": ROOM_SIZE, "wall_height": WALL_HEIGHT, "floor_levels": FLOOR_Y},
        "layers": layers, "rooms": all_rooms,
        "bridge_cells": [list(p) for p in bridge_cells], "crossings": crossing_cells,
        "staircases": staircases, "lift": {"x": (lift[0] + 0.5) * CELL - 135.0, "z": (lift[1] + 0.5) * CELL - 54.0, "lower_y": 0.0, "upper_y": 17.0},
        "shortcuts": shortcut_candidates,
        "dead_end_candidates": dead_ends,
        "notes": "Deterministic DFS room mazes plus graph cycles; lower and upper corridors share deliberate x/z crossings."
    }


def write_textures(out: Path) -> None:
    tex = out / "textures"
    tex.mkdir(parents=True, exist_ok=True)
    make_pbr_textures(tex)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="assets/levelgen")
    parser.add_argument("--seed", type=int, default=SEED_DEFAULT)
    args = parser.parse_args()
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    layout = build_layout(args.seed)
    (out / "dungeon-layout.json").write_text(json.dumps(layout, indent=2), encoding="utf-8")
    compact = json.dumps(layout, separators=(",", ":"), ensure_ascii=True)
    (out / "dungeon-layout.js").write_text("window.BB_GENERATED_DUNGEON_LAYOUT=" + compact + ";\n", encoding="utf-8")
    write_textures(out)
    print(f"Wrote {out / 'dungeon-layout.json'} ({len(layout['bridge_cells'])} bridge cells, seed {args.seed})")


if __name__ == "__main__":
    main()
