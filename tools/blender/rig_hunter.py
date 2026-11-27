import bpy
import math
import sys
from mathutils import Vector, Matrix

SRC = sys.argv[-2] if len(sys.argv) >= 3 else "/tmp/hunter_decoded.glb"
DST = sys.argv[-1] if len(sys.argv) >= 3 else "/tmp/hunter_rigged.glb"
TARGET_H = 1.8

bpy.ops.wm.read_factory_settings(use_empty=True)
print("[1] Importing", SRC)
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
assert meshes, "no mesh imported"
mesh = meshes[0]

bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True)
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
mesh.parent = None
mesh.location = (0, 0, 0)
for o in bpy.data.objects:
    if o.type != "MESH" and o is not None:
        try:
            o.hide_set(True)
        except Exception:
            pass

verts = [v.co for v in mesh.data.vertices]
zmin = min(v.z for v in verts)
zmax = max(v.z for v in verts)
cx = (min(v.x for v in verts) + max(v.x for v in verts)) / 2
cy = (min(v.y for v in verts) + max(v.y for v in verts)) / 2
h = zmax - zmin
s = TARGET_H / h
M = Matrix.Scale(s, 4) @ Matrix.Translation((-cx, -cy, -zmin))
mesh.data.transform(M)
print(f"[2] normalized: height {h:.3f} -> {TARGET_H}, scale {s:.4f}")

arm_data = bpy.data.armatures.new("HunterRig")
arm = bpy.data.objects.new("HunterRig", arm_data)
bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")

V = lambda x, y, z: Vector((x, y, z))

def bone(name, head, tail, parent=None):
    b = arm_data.edit_bones.new(name)
    b.head = head
    b.tail = tail
    if parent:
        b.parent = arm_data.edit_bones[parent]
    return b

bone("hips", V(-0.02, 0, 0.92), V(0.02, 0, 1.02))
bone("spine", V(0, 0, 1.02), V(0, 0, 1.18), "hips")
bone("chest", V(0, 0, 1.18), V(0, 0, 1.38), "spine")
bone("neck", V(0, 0, 1.38), V(0, 0, 1.48), "chest")
bone("head", V(0, 0, 1.48), V(0, 0.02, 1.68), "neck")
for side, sx in (("L", 1), ("R", -1)):
    bone(f"shoulder.{side}", V(0.06 * sx, 0, 1.39), V(0.12 * sx, 0, 1.40), "chest")
    bone(f"upper_arm.{side}", V(0.13 * sx, 0, 1.40), V(0.15 * sx, -0.02, 1.02), f"shoulder.{side}")
    bone(f"lower_arm.{side}", V(0.15 * sx, -0.02, 1.02), V(0.16 * sx, -0.02, 0.68), f"upper_arm.{side}")
    bone(f"thigh.{side}", V(0.07 * sx, 0, 0.88), V(0.07 * sx, 0.01, 0.46), "hips")
    bone(f"shin.{side}", V(0.07 * sx, 0.01, 0.46), V(0.07 * sx, 0, 0.08), f"thigh.{side}")

bpy.ops.object.mode_set(mode="OBJECT")
print("[3] bones:", len(arm_data.bones))

mesh.parent = arm
mod = mesh.modifiers.new("Armature", "ARMATURE")
mod.object = arm

import numpy as np
bones_world = [(b.name, tuple(b.head_local), tuple(b.tail_local)) for b in arm_data.bones]
verts_np = np.array([v.co for v in mesh.data.vertices])
N = len(verts_np)

def point_seg_dist(p, a, b_):
    ab = np.array(b_) - np.array(a)
    t = np.clip(np.dot(p - np.array(a), ab) / max(np.dot(ab, ab), 1e-9), 0.0, 1.0)
    proj = np.array(a) + t[:, None] * ab if isinstance(t, np.ndarray) else np.array(a) + t * ab
    return np.linalg.norm(p - proj, axis=1)

for name, head, tail in bones_world:
    mesh.vertex_groups.new(name=name)

dist = np.stack([point_seg_dist(verts_np, head, tail) for name, head, tail in bones_world], axis=1)
w = 1.0 / (dist ** 4 + 1e-4)
top4 = np.argsort(-w, axis=1)[:, :4]
rowsum = np.take_along_axis(w, top4, axis=1).sum(axis=1, keepdims=True)
wn = np.take_along_axis(w, top4, axis=1) / rowsum

vg_index = {g.name: g.index for g in mesh.vertex_groups}
top2 = np.argsort(-w, axis=1)[:, :2]
w2 = np.take_along_axis(w, top2, axis=1)
w2n = w2 / w2.sum(axis=1, keepdims=True)
for bi, (name, _, _) in enumerate(bones_world):
    grp = mesh.vertex_groups[vg_index[name]]
    for slot in (0, 1):
        mask = top2[:, slot] == bi
        idx = np.nonzero(mask)[0]
        if len(idx) == 0:
            continue
        wgt = w2n[idx, slot]
        for bucket in np.unique(np.round(wgt, 2)):
            sel = idx[np.abs(np.round(wgt, 2) - bucket) < 1e-9]
            grp.add(sel.tolist(), float(bucket), "REPLACE")
n_with_w = sum(1 for v in mesh.data.vertices if len(v.groups) > 0)
print(f"[4a] verts with weights: {n_with_w}/{len(mesh.data.vertices)}")

def make_action(name, length, channels):
    action = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = action

    def set_rot(bone_name, frame, x=0, y=0, z=0):
        pb = arm.pose.bones[bone_name]
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = (math.radians(x), math.radians(y), math.radians(z))
        pb.keyframe_insert("rotation_euler", frame=frame)

    def set_loc(bone_name, frame, x=0, y=0, z=0):
        pb = arm.pose.bones[bone_name]
        pb.location = (x, y, z)
        pb.keyframe_insert("location", frame=frame)

    for frame in range(1, length + 1):
        t = (frame - 1) / max(length - 1, 1)
        channels(t, frame, set_rot, set_loc)
    return action

def idle_pose(t, frame, set_rot, set_loc):
    breath = math.sin(t * 2 * math.pi)
    sway = math.sin(t * 2 * math.pi + 0.7)
    set_rot("spine", frame, x=1.2 * breath)
    set_rot("chest", frame, x=0.8 * breath, z=1.5 * sway)
    set_rot("neck", frame, x=-1.0 * breath, z=-1.2 * sway)
    set_rot("head", frame, z=1.0 * sway)
    set_rot("upper_arm.L", frame, z=2.5 * sway, x=-0.8 * breath)
    set_rot("upper_arm.R", frame, z=-2.5 * sway, x=-0.8 * breath)
    set_rot("lower_arm.L", frame, x=-1.5 * (1 + 0.2 * breath))
    set_rot("lower_arm.R", frame, x=-1.5 * (1 + 0.2 * breath))
    set_rot("hips", frame, z=-0.8 * sway)
    set_loc("hips", frame, z=0.006 * breath)

def run_pose(t, frame, set_rot, set_loc):
    ph = t * 2 * math.pi
    s_ = math.sin(ph)
    c = math.cos(ph)
    set_rot("thigh.L", frame, x=-42 * s_)
    set_rot("thigh.R", frame, x=42 * s_)
    set_rot("shin.L", frame, x=max(0, 55 * c))
    set_rot("shin.R", frame, x=max(0, -55 * c))
    set_rot("upper_arm.L", frame, x=38 * s_, z=6)
    set_rot("upper_arm.R", frame, x=-38 * s_, z=-6)
    set_rot("lower_arm.L", frame, x=-55)
    set_rot("lower_arm.R", frame, x=-55)
    set_rot("spine", frame, x=10)
    set_rot("chest", frame, y=6 * s_)
    set_rot("head", frame, x=-8)
    set_loc("hips", frame, z=0.05 * abs(math.sin(ph * 2)) - 0.02)

def dodge_pose(t, frame, set_rot, set_loc):
    ph = math.sin(t * math.pi)
    set_loc("hips", frame, y=0.55 * ph, z=-0.38 * ph)
    set_rot("thigh.L", frame, x=-70 * ph)
    set_rot("thigh.R", frame, x=-55 * ph)
    set_rot("shin.L", frame, x=95 * ph)
    set_rot("shin.R", frame, x=75 * ph)
    set_rot("spine", frame, x=28 * ph)
    set_rot("chest", frame, x=12 * ph)
    set_rot("upper_arm.L", frame, x=-60 * ph, z=25 * ph)
    set_rot("upper_arm.R", frame, x=-45 * ph, z=-20 * ph)
    set_rot("lower_arm.L", frame, x=-80 * ph)
    set_rot("lower_arm.R", frame, x=-70 * ph)
    set_rot("head", frame, x=-15 * ph)

def attack_pose(t, frame, set_rot, set_loc):
    if t < 0.35:
        k = t / 0.35
        set_rot("chest", frame, y=-38 * k, x=-6 * k)
        set_rot("upper_arm.R", frame, x=-140 * k, z=-30 * k)
        set_rot("lower_arm.R", frame, x=-70 * (1 - k))
        set_rot("upper_arm.L", frame, x=25 * k, z=30 * k)
        set_rot("spine", frame, y=-12 * k)
    elif t < 0.6:
        k = (t - 0.35) / 0.25
        set_rot("chest", frame, y=-38 + 58 * k, x=-6 + 16 * k)
        set_rot("upper_arm.R", frame, x=-140 + 170 * k, z=-30 + 25 * k)
        set_rot("lower_arm.R", frame, x=-25)
        set_rot("upper_arm.L", frame, x=25 - 40 * k, z=30 - 45 * k)
        set_rot("spine", frame, y=-12 + 20 * k)
        set_loc("hips", frame, y=0.12 * math.sin(k * math.pi), z=-0.08 * math.sin(k * math.pi))
    else:
        k = (t - 0.6) / 0.4
        set_rot("chest", frame, y=20 - 20 * k, x=10 - 10 * k)
        set_rot("upper_arm.R", frame, x=30 - 30 * k, z=-5 + 5 * k)
        set_rot("lower_arm.R", frame, x=-25 + 25 * k)
        set_rot("upper_arm.L", frame, x=-15 + 15 * k, z=-15 + 15 * k)
        set_loc("hips", frame, y=0, z=0)

make_action("Idle", 48, idle_pose)
make_action("Run", 18, run_pose)
make_action("Dodge", 16, dodge_pose)
make_action("Attack", 24, attack_pose)
print("[5] actions:", sorted(a.name for a in bpy.data.actions))

print("[6] exporting", DST)
bpy.ops.export_scene.gltf(
    filepath=DST,
    export_format="GLB",
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_yup=True,
    export_skins=True,
)
print("DONE")
