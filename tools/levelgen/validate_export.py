#!/usr/bin/env python3
"""Validate the generated GLB container and its matching runtime navigation package."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path


def fail(message: str) -> None:
    raise SystemExit("LEVELGEN VALIDATION FAILED: " + message)


def read_glb_json(path: Path) -> dict:
    raw = path.read_bytes()
    if len(raw) < 20:
        fail("GLB is truncated")
    magic, version, declared_length = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or declared_length != len(raw):
        fail("invalid GLB header/version/length")
    offset = 12
    json_chunk = None
    while offset + 8 <= len(raw):
        length, kind = struct.unpack_from("<I4s", raw, offset)
        offset += 8
        payload = raw[offset:offset + length]
        offset += length
        if len(payload) != length:
            fail("truncated GLB chunk")
        if kind == b"JSON":
            json_chunk = payload
            break
    if json_chunk is None:
        fail("missing JSON chunk")
    try:
        return json.loads(json_chunk.decode("utf-8").rstrip(" \0"))
    except Exception as exc:
        fail(f"invalid GLB JSON: {exc}")


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "assets/levelgen").resolve()
    glb_path = out / "bb_gothic_dungeon.glb"
    layout_path = out / "dungeon-layout.json"
    runtime_path = out / "dungeon-runtime.json"
    for path in (glb_path, layout_path, runtime_path):
        if not path.is_file():
            fail(f"missing {path.name}")
    glb = read_glb_json(glb_path)
    layout = json.loads(layout_path.read_text(encoding="utf-8"))
    runtime = json.loads(runtime_path.read_text(encoding="utf-8"))
    meshes = glb.get("meshes", [])
    materials = glb.get("materials", [])
    textures = glb.get("textures", [])
    if not meshes or len(meshes) > 24:
        fail(f"unexpected mesh batch count: {len(meshes)} (expected 1..24)")
    if not materials or not textures:
        fail("GLB has no exported PBR material/textures")
    if not any(m.get("normalTexture") for m in materials):
        fail("GLB material is missing its tangent-space normal map")
    if not any(m.get("pbrMetallicRoughness", {}).get("baseColorTexture") for m in materials):
        fail("GLB material is missing its albedo map")
    if not any(m.get("pbrMetallicRoughness", {}).get("metallicRoughnessTexture") for m in materials):
        fail("GLB material is missing its roughness/metallic map")
    if len(runtime.get("layers", [])) != 2 or runtime.get("seed") != layout.get("seed"):
        fail("runtime manifest does not match the two-level source layout")
    if len(runtime.get("staircases", [])) != 3 or not runtime.get("shortcuts"):
        fail("expected three stair links and locked shortcuts")
    if len(runtime.get("wall_colliders", [])) < 500:
        fail("runtime manifest is missing wall colliders")
    for layer in runtime["layers"]:
        if len(layer.get("walkable", [])) < 100:
            fail("a tier has too few walkable cells")
    for name in ("stone_albedo.png", "stone_normal.png", "stone_roughness.png", "stone_ao.png"):
        if not (out / "textures" / name).is_file():
            fail(f"missing source PBR map {name}")
    size_mb = glb_path.stat().st_size / (1024 * 1024)
    if size_mb > 24:
        fail(f"GLB exceeds mobile-oriented size budget: {size_mb:.1f} MiB")
    print(f"Validated GLB v2: {len(meshes)} mesh batches, {len(materials)} material(s), {len(textures)} embedded texture(s), {size_mb:.2f} MiB")
    print(f"Validated runtime data: {sum(len(l['walkable']) for l in runtime['layers'])} walkable cells, {len(runtime['wall_colliders'])} colliders, {len(runtime['shortcuts'])} shortcuts")


if __name__ == "__main__":
    main()
