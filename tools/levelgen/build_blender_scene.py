#!/usr/bin/env python3
"""Build a modular Gothic multi-level dungeon from dungeon-layout.json in Blender."""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


class MeshBuilder:
    def __init__(self, name: str, material):
        self.name = name
        self.material = material
        self.verts = []
        self.faces = []
        self.face_uvs = []

    def box(self, center, size, uv_repeat=(1.0, 1.0)):
        cx, cy, cz = center
        sx, sy, sz = (v * 0.5 for v in size)
        base = len(self.verts)
        self.verts += [
            (cx-sx, cy-sy, cz-sz), (cx+sx, cy-sy, cz-sz),
            (cx+sx, cy+sy, cz-sz), (cx-sx, cy+sy, cz-sz),
            (cx-sx, cy-sy, cz+sz), (cx+sx, cy-sy, cz+sz),
            (cx+sx, cy+sy, cz+sz), (cx-sx, cy+sy, cz+sz),
        ]
        face_data = [
            ((0, 3, 2, 1), (uv_repeat[0], uv_repeat[1])),
            ((4, 5, 6, 7), (uv_repeat[0], uv_repeat[1])),
            ((0, 1, 5, 4), (uv_repeat[0], uv_repeat[1])),
            ((1, 2, 6, 5), (uv_repeat[0], uv_repeat[1])),
            ((2, 3, 7, 6), (uv_repeat[0], uv_repeat[1])),
            ((3, 0, 4, 7), (uv_repeat[0], uv_repeat[1])),
        ]
        for face, repeat in face_data:
            self.faces.append(tuple(base + i for i in face))
            self.face_uvs.append(repeat)

    def sloped_box(self, center, size, angle, uv_repeat=(1.0, 1.0)):
        cx, cy, cz = center
        sx, sy, sz = (v * 0.5 for v in size)
        c, s = math.cos(angle), math.sin(angle)
        base = len(self.verts)
        for x, y, z in [
            (-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
            (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz),
        ]:
            self.verts.append((cx + x, cy + y*c - z*s, cz + y*s + z*c))
        face_data = [
            ((0, 3, 2, 1), uv_repeat), ((4, 5, 6, 7), uv_repeat),
            ((0, 1, 5, 4), uv_repeat), ((1, 2, 6, 5), uv_repeat),
            ((2, 3, 7, 6), uv_repeat), ((3, 0, 4, 7), uv_repeat),
        ]
        for face, repeat in face_data:
            self.faces.append(tuple(base + i for i in face))
            self.face_uvs.append(repeat)

    def cylinder(self, center, radius, depth, sides=12):
        cx, cy, cz = center
        base = len(self.verts)
        for y in (-depth * 0.5, depth * 0.5):
            for i in range(sides):
                a = i / sides * math.tau
                self.verts.append((cx + math.cos(a) * radius, cy + y, cz + math.sin(a) * radius))
        self.faces.append(tuple(base + i for i in reversed(range(sides))))
        self.face_uvs.append((1, 1))
        self.faces.append(tuple(base + sides + i for i in range(sides)))
        self.face_uvs.append((1, 1))
        for i in range(sides):
            j = (i + 1) % sides
            self.faces.append((base+i, base+j, base+sides+j, base+sides+i))
            self.face_uvs.append((1, 1))

    def object(self):
        mesh = bpy.data.meshes.new(self.name + "Mesh")
        mesh.from_pydata(self.verts, [], self.faces)
        mesh.materials.append(self.material)
        mesh.update()
        uv = mesh.uv_layers.new(name="UVMap")
        for poly in mesh.polygons:
            poly.use_smooth = False
            repx, repy = self.face_uvs[poly.index]
            loops = list(poly.loop_indices)
            coords = ((0, 0), (repx, 0), (repx, repy), (0, repy))
            for li, co in zip(loops, coords):
                uv.data[li].uv = co
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.collection.objects.link(obj)
        obj["asset_type"] = self.name.lower()
        if "Walls" not in self.name:
            bevel = obj.modifiers.new("Hand-worn stone edges", "BEVEL")
            bevel.width = 0.035 if "Floors" in self.name else (0.08 if "Bridge" in self.name else 0.06)
            bevel.segments = 1 if "Floors" in self.name else 2
            bevel.limit_method = "ANGLE"
            bevel.angle_limit = math.radians(28)
        return obj


def make_stone_material(texture_dir: Path):
    mat = bpy.data.materials.new("BB_Weathered_Basalt_PBR")
    mat.use_nodes = True
    mat.diffuse_color = (0.14, 0.145, 0.16, 1)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (620, 80)
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.location = (360, 80)
    shader.inputs["Metallic"].default_value = 0.03
    shader.inputs["Roughness"].default_value = 0.88
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    tex_paths = {
        "albedo": texture_dir / "stone_albedo.png",
        "normal": texture_dir / "stone_normal.png",
        "roughness": texture_dir / "stone_roughness.png",
        "ao": texture_dir / "stone_ao.png",
    }
    for name, path in tex_paths.items():
        if not path.exists():
            raise FileNotFoundError(f"Missing generated texture: {path}")
        image = bpy.data.images.load(str(path), check_existing=True)
        image.pack()
        node = nodes.new("ShaderNodeTexImage")
        node.image = image
        node.label = "PBR " + name
        node.location = (0, 250 - list(tex_paths).index(name) * 180)
        if name == "albedo":
            image.colorspace_settings.name = "sRGB"
            links.new(node.outputs["Color"], shader.inputs["Base Color"])
        elif name == "normal":
            image.colorspace_settings.name = "Non-Color"
            normal = nodes.new("ShaderNodeNormalMap")
            normal.location = (190, -80)
            links.new(node.outputs["Color"], normal.inputs["Color"])
            links.new(normal.outputs["Normal"], shader.inputs["Normal"])
        elif name == "roughness":
            image.colorspace_settings.name = "Non-Color"
            links.new(node.outputs["Color"], shader.inputs["Roughness"])
        else:
            image.colorspace_settings.name = "Non-Color"
            # Kept in the native material graph and packed in the source .blend.
            # The sidecar is also emitted for runtime AO binding by the host renderer.
            mat["ao_texture"] = image.name
    return mat


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.images):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def add_gothic_arch(name, center, width, spring_height, top_height, depth, material, rotate_z=0.0):
    """Pointed stone arch as an extruded bevelled poly-curve, suitable for doorways and bridge ribs."""
    x0, y0, z0 = center
    curve = bpy.data.curves.new(name + "Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = 0.22
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    points = []
    half = width * 0.5
    points.extend([(-half, 0), (-half, spring_height)])
    for i in range(17):
        t = i / 16
        x = -half + width * t
        y = spring_height + (top_height - spring_height) * (1 - abs(2 * t - 1) ** 1.35)
        points.append((x, y))
    points.append((half, 0))
    spline.points.add(len(points) - 1)
    for p, (x, y) in zip(spline.points, points):
        p.co = (x, y, 0, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = (x0, y0, z0)
    obj.rotation_euler[2] = rotate_z
    curve.bevel_depth = 0.23
    curve.bevel_resolution = 2
    curve.extrude = depth * 0.05
    obj.data.materials.append(material)
    obj["asset_type"] = "gothic_arch"
    return obj


def room_edges(layout, floor):
    return [tuple(e) for e in layout["layers"][floor]["room_graph"]]


def build_scene(layout_path: Path, out_dir: Path):
    layout = json.loads(layout_path.read_text(encoding="utf-8"))
    world = layout["world"]
    cell = world["cell_size"]
    ox, oz = world["origin_x"], world["origin_z"]
    width, depth = world["width_cells"], world["depth_cells"]
    wall_h = world["wall_height"]
    out_dir.mkdir(parents=True, exist_ok=True)
    clear_scene()
    stone = make_stone_material(out_dir / "textures")

    floors = MeshBuilder("Dungeon_Floors", stone)
    walls = MeshBuilder("Dungeon_Walls", stone)
    bridges = MeshBuilder("Upper_Crossing_Bridges", stone)
    stair_mesh = MeshBuilder("Walkable_Stair_Modules", stone)
    columns = MeshBuilder("Gothic_Columns", stone)
    gate_mesh = MeshBuilder("Locked_Shortcut_Gates", stone)
    bridge_set = {tuple(p) for p in layout["bridge_cells"]}

    # Tile floors and boundary walls are derived only from the graph's walkable masks.
    for layer in layout["layers"]:
        floor_y = layer["y"]
        grid = layer["grid"]
        for z in range(depth):
            for x in range(width):
                if grid[z][x] != 0:
                    continue
                wx = ox + (x + 0.5) * cell
                wz = oz + (z + 0.5) * cell
                if layer["index"] == 1 and (x, z) in bridge_set:
                    bridges.box((wx, floor_y - 0.23, wz), (cell, 0.46, cell), (1.5, 1.5))
                    # Low, broken parapets preserve the view to the lower street.
                    for dx, dz in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                        nx, nz = x + dx, z + dz
                        if not (0 <= nx < width and 0 <= nz < depth) or grid[nz][nx]:
                            if (dx, dz) in ((0, -1), (0, 1)):
                                walls.box((wx, floor_y + 0.55, wz + dz * (cell * 0.5 - 0.2)), (cell, 1.1, 0.4))
                            else:
                                walls.box((wx + dx * (cell * 0.5 - 0.2), floor_y + 0.55, wz), (0.4, 1.1, cell))
                else:
                    floors.box((wx, floor_y - 0.23, wz), (cell, 0.46, cell), (1.4, 1.4))
                for dx, dz in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                    nx, nz = x + dx, z + dz
                    if 0 <= nx < width and 0 <= nz < depth and grid[nz][nx] == 0:
                        continue
                    if layer["index"] == 1 and (x, z) in bridge_set:
                        continue
                    if (dx, dz) in ((0, -1), (0, 1)):
                        center = (wx, floor_y + wall_h * 0.5, wz + dz * (cell * 0.5 - 0.12))
                        size = (cell + 0.12, wall_h, 0.48)
                    else:
                        center = (wx + dx * (cell * 0.5 - 0.12), floor_y + wall_h * 0.5, wz)
                        size = (0.48, wall_h, cell + 0.12)
                    walls.box(center, size, (1.3, wall_h / 4.0))

    # Real stair flights between the authored lower and upper landings.
    for stair in layout["staircases"]:
        count = 25
        run, rise, sw = stair["run"], stair["upper_y"] - stair["lower_y"], stair["width"]
        tread = run / count
        for i in range(count):
            t = (i + 1) / count
            z = stair["z"] + (i + 0.5) * tread
            y = stair["lower_y"] + t * rise - 0.16
            stair_mesh.box((stair["x"], y, z), (sw, 0.32, tread * 1.05), (1.0, 0.7))
        # Low waist-height side fences leave the space below each stair flight open.
        fence_height = 3.8
        landing_depth = 3.5
        rail_length = math.sqrt(run * run + rise * rise)
        rail_angle = math.atan2(run, rise)
        post_count = max(2, math.ceil(run / 3.5))
        for side in (-1, 1):
            rail_x = stair["x"] + side * (sw * 0.5 + 0.25)
            for i in range(post_count + 1):
                t = i / post_count
                stair_mesh.box((rail_x, stair["lower_y"] + t * rise + fence_height * 0.5, stair["z"] + t * run), (0.28, fence_height, 0.28), (0.5, 2.0))
            for height_ratio in (0.5, 0.98):
                stair_mesh.sloped_box((rail_x, stair["lower_y"] + rise * 0.5 + fence_height * height_ratio, stair["z"] + run * 0.5), (0.24, rail_length, 0.28), rail_angle, (0.5, 2.0))
            stair_mesh.box((rail_x, stair["upper_y"] + fence_height * 0.5, stair["z"] + run + landing_depth), (0.28, fence_height, 0.28), (0.5, 2.0))
            for height_ratio in (0.5, 0.98):
                stair_mesh.box((rail_x, stair["upper_y"] + fence_height * height_ratio, stair["z"] + run + landing_depth * 0.5), (0.28, 0.24, landing_depth), (0.5, 2.0))

    # Bridge supports: ribs and clustered piers at both over-under crossings.
    for idx, (x, z) in enumerate(layout["crossings"]):
        wx, wz = ox + (x + 0.5) * cell, oz + (z + 0.5) * cell
        for side in (-1, 1):
            columns.cylinder((wx + side * 4.2, 8.15, wz), 0.78, 15.8, sides=12)
            columns.box((wx + side * 4.2, 15.95, wz), (2.0, 0.65, 2.0))
            columns.box((wx + side * 4.2, 0.5, wz), (2.4, 0.8, 2.4))
        add_gothic_arch(f"Crossing_Gothic_Rib_{idx+1}", (wx, 0.75, wz), 8.4, 9.4, 16.0, 1.0, stone)
    # Repeating slim piers and pointed ribs turn the long gallery into architecture.
    for x in range(4, width - 2, 7):
        wx, wz = ox + (x + 0.5) * cell, oz + (8.5) * cell
        for side in (-1, 1):
            columns.cylinder((wx, 8.15, wz + side * 4.0), 0.42, 15.7, sides=10)
            columns.box((wx, 15.8, wz + side * 4.0), (1.35, 0.55, 1.35))
        add_gothic_arch(f"Gallery_Rib_{x:02d}", (wx, 0.75, wz), 8.0, 8.8, 15.9, 0.5, stone, rotate_z=math.pi / 2)

    # Architraves at graph links, alternating orientation by edge direction.
    for floor in range(2):
        for a, b in room_edges(layout, floor):
            ar, ac = divmod(a, world["room_cols"])
            br, bc = divmod(b, world["room_cols"])
            if bc > ac:
                center = (ox + (ac + 1) * world["room_size"] * cell, world["floor_levels"][floor], oz + (ar * world["room_size"] + world["room_size"] / 2) * cell)
                add_gothic_arch(f"Room_Arch_F{floor}_{a}_{b}", center, 5.0, 4.3, 7.2, 1.0, stone, rotate_z=math.pi / 2)
            elif br > ar:
                center = (ox + (ac * world["room_size"] + world["room_size"] / 2) * cell, world["floor_levels"][floor], oz + (ar + 1) * world["room_size"] * cell)
                add_gothic_arch(f"Room_Arch_F{floor}_{a}_{b}", center, 5.0, 4.3, 7.2, 1.0, stone)

    # Locked shortcut gate frames are placed in graph edges not initially open.
    for gate in layout["shortcuts"]:
        floor = gate["floor"]
        gx, gz = gate["world_x"], gate["world_z"]
        floor_y = world["floor_levels"][floor]
        if gate.get("axis") == "x":
            gate_mesh.box((gx, floor_y + 5.0, gz), (0.38, 9.6, 5.1))
            for i in range(9):
                gate_mesh.box((gx, floor_y + 4.8, gz - 2.2 + i * 0.55), (0.16, 9.2, 0.12))
        else:
            gate_mesh.box((gx, floor_y + 5.0, gz), (5.1, 9.6, 0.38))
            for i in range(9):
                gate_mesh.box((gx - 2.2 + i * 0.55, floor_y + 4.8, gz), (0.12, 9.2, 0.16))
        gate["world_y"] = floor_y

    # Join each material batch into a small number of draw calls.
    scene_objects = []
    for builder in (floors, walls, bridges, stair_mesh, columns, gate_mesh):
        if builder.faces:
            scene_objects.append(builder.object())
    arch_objects = [obj for obj in bpy.context.scene.objects if obj.type == "CURVE"]
    if arch_objects:
        bpy.ops.object.select_all(action="DESELECT")
        for obj in arch_objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = arch_objects[0]
        bpy.ops.object.convert(target="MESH")
        converted = [obj for obj in bpy.context.selected_objects if obj.type == "MESH"]
        if converted:
            bpy.context.view_layer.objects.active = converted[0]
            bpy.ops.object.join()
            bpy.context.object.name = "Gothic_Arch_Modules"
            bpy.context.object["asset_type"] = "gothic_arch_batch"
            bpy.context.object["mobile_optimized"] = True
    # Disable shadow casting only for tile floors; the game renderer controls final quality.
    for obj in scene_objects:
        obj["source_layout"] = "dungeon-layout.json"
        obj["mobile_optimized"] = True
        obj["cast_shadow"] = obj.name not in ("Dungeon_Floors",)
        if obj.name == "Gothic_Columns":
            chip_texture = bpy.data.textures.new("Subtle_Basalt_Chipping", type="CLOUDS")
            chip_texture.noise_scale = 0.34
            chip_texture.noise_depth = 2
            subdiv = obj.modifiers.new("Stone fracture surface", "SUBSURF")
            subdiv.levels = 1
            subdiv.render_levels = 1
            displace = obj.modifiers.new("Eroded chipped stone", "DISPLACE")
            displace.texture = chip_texture
            displace.strength = 0.075
            displace.mid_level = 0.56
    for obj in bpy.context.scene.objects:
        if obj.type == "CURVE":
            obj["source_layout"] = "dungeon-layout.json"
            obj["mobile_optimized"] = True

    # Set unit scale and dark cinematic world defaults for an editable Blender source.
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 50
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    scene.render.fps = 30
    scene.unit_settings.system = "NONE"
    scene.world.color = (0.008, 0.01, 0.016)
    scene["generator"] = "tools/levelgen/build_blender_scene.py"
    scene["layout_seed"] = layout["seed"]
    scene["pbr_maps"] = "stone_albedo.png; stone_normal.png; stone_roughness.png; stone_ao.png"

    # Emit game-side collision/navigation manifest alongside the art asset.
    wall_colliders = []
    bridge_lookup = {tuple(p) for p in layout["bridge_cells"]}
    for layer in layout["layers"]:
        floor_y, grid = layer["y"], layer["grid"]
        for z in range(depth):
            for x in range(width):
                if grid[z][x] != 0:
                    continue
                wx, wz = ox + (x + 0.5) * cell, oz + (z + 0.5) * cell
                for dx, dz in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                    nx, nz = x + dx, z + dz
                    if 0 <= nx < width and 0 <= nz < depth and grid[nz][nx] == 0:
                        continue
                    if layer["index"] == 1 and (x, z) in bridge_lookup:
                        wall_h_here = 1.1
                    else:
                        wall_h_here = wall_h
                    if (dx, dz) in ((0, -1), (0, 1)):
                        cx, cz, w, d = wx, wz + dz * (cell * 0.5 - 0.12), cell + 0.12, 0.48
                    else:
                        cx, cz, w, d = wx + dx * (cell * 0.5 - 0.12), wz, 0.48, cell + 0.12
                    wall_colliders.append({
                        "minX": cx - w * 0.5, "maxX": cx + w * 0.5,
                        "minY": floor_y, "maxY": floor_y + wall_h_here,
                        "minZ": cz - d * 0.5, "maxZ": cz + d * 0.5,
                        "cx": cx, "cy": floor_y + wall_h_here * 0.5, "cz": cz,
                        "w": w, "h": wall_h_here, "d": d, "floorY": floor_y,
                    })
    for gate in layout["shortcuts"]:
        half_t = 0.24
        wall_colliders.append({
            "id": gate["id"], "type": "shortcut_gate",
            "minX": gate["world_x"] - half_t, "maxX": gate["world_x"] + half_t,
            "minY": gate["world_y"], "maxY": gate["world_y"] + 9.6,
            "minZ": gate["world_z"] - 2.55, "maxZ": gate["world_z"] + 2.55,
            "cx": gate["world_x"], "cy": gate["world_y"] + 4.8, "cz": gate["world_z"],
            "w": 0.48, "h": 9.6, "d": 5.1, "floorY": gate["world_y"],
        })
    manifest = {
        "schema": "bb-dungeon-runtime/1",
        "seed": layout["seed"],
        "world": world,
        "layers": [{"y": layer["y"], "walkable": [[x, z] for z, row in enumerate(layer["grid"]) for x, v in enumerate(row) if v == 0]} for layer in layout["layers"]],
        "staircases": layout["staircases"],
        "lift": layout["lift"],
        "shortcuts": layout["shortcuts"],
        "bridge_cells": layout["bridge_cells"],
        "crossings": layout["crossings"],
        "wall_colliders": wall_colliders,
        "dead_end_candidates": layout["dead_end_candidates"],
        "wall_height": wall_h,
        "cell_size": cell,
        "origin_x": ox,
        "origin_z": oz,
        "glb": "bb_gothic_dungeon.glb",
    }
    (out_dir / "dungeon-runtime.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    blend_path = out_dir / "bb_gothic_dungeon.blend"
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    glb_path = out_dir / "bb_gothic_dungeon.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path), export_format="GLB", export_apply=True,
        export_texcoords=True, export_normals=True, export_materials="EXPORT",
        export_cameras=False, export_lights=False, export_animations=False,
        export_yup=True, export_image_format="AUTO", export_extras=True,
    )
    print(f"Exported {glb_path} ({glb_path.stat().st_size / (1024*1024):.2f} MiB)")
    print(f"Saved editable Blender project {blend_path}")
    print(f"Saved collision/navigation manifest {out_dir / 'dungeon-runtime.json'}")


def cli_args():
    raw = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="assets/levelgen/dungeon-layout.json")
    parser.add_argument("--out", default="assets/levelgen")
    return parser.parse_args(raw)


if __name__ == "__main__":
    args = cli_args()
    build_scene(Path(args.input).resolve(), Path(args.out).resolve())
