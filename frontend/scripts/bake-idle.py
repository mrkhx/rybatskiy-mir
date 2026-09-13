#!/usr/bin/env python3
"""Author and bake a relaxed IDLE on the gardener Bip01 armature.

Same FBX import + bone rename as export-production-fisherman.py.
Local Euler keys only. No constraints, no WORLD copy, no Mixamo.
Head / Neck / legs stay at bind. Mesh is not written into production.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Euler

FBX = "/tmp/rocketbox/Gardener_Male_01/Export/Gardener_Male_01.fbx"
OUT = "/tmp/idle_baked.glb"
FPS = 30
FRAMES = 90  # 3.0s seamless loop

BONE_MAP = {
    "Bip01 Pelvis": "Hips",
    "Bip01 Spine": "Spine",
    "Bip01 Spine1": "Spine1",
    "Bip01 Spine2": "Chest",
    "Bip01 Neck": "Neck",
    "Bip01 Head": "Head",
    "Bip01 L Clavicle": "Shoulder_L",
    "Bip01 R Clavicle": "Shoulder_R",
    "Bip01 L UpperArm": "UpperArm_L",
    "Bip01 L Forearm": "LowerArm_L",
    "Bip01 L Hand": "Hand_L",
    "Bip01 R UpperArm": "UpperArm_R",
    "Bip01 R Forearm": "LowerArm_R",
    "Bip01 R Hand": "Hand_R",
    "Bip01 L Thigh": "UpperLeg_L",
    "Bip01 L Calf": "LowerLeg_L",
    "Bip01 L Foot": "Foot_L",
    "Bip01 L Toe0": "Toe_L",
    "Bip01 R Thigh": "UpperLeg_R",
    "Bip01 R Calf": "LowerLeg_R",
    "Bip01 R Foot": "Foot_R",
    "Bip01 R Toe0": "Toe_R",
}
FINGER = ["Thumb", "Index", "Middle", "Ring", "Pinky"]
for side, pref in (("L", "Bip01 L"), ("R", "Bip01 R")):
    for i, name in enumerate(FINGER):
        BONE_MAP[f"{pref} Finger{i}"] = f"{name}_{side}_1"
        BONE_MAP[f"{pref} Finger{i}1"] = f"{name}_{side}_2"
        BONE_MAP[f"{pref} Finger{i}2"] = f"{name}_{side}_3"


def wpos(arm, n):
    return (arm.matrix_world @ arm.pose.bones[n].matrix).to_translation()


def report(tag, arm):
    def fmt(n):
        v = wpos(arm, n)
        return f"({v.x:5.2f},{v.y:5.2f},{v.z:5.2f})"

    print(
        tag,
        "HL",
        fmt("Hand_L"),
        "HR",
        fmt("Hand_R"),
        "HD",
        fmt("Head"),
        "FL",
        fmt("Foot_L"),
        "FR",
        fmt("Foot_R"),
        "hips",
        fmt("Hips"),
    )


def reset(arm):
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    bpy.context.view_layer.update()


def apply_euler(arm, pose_deg):
    reset(arm)
    for name, xyz in pose_deg.items():
        pb = arm.pose.bones.get(name)
        if not pb:
            continue
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = Euler([math.radians(v) for v in xyz], "XYZ")
    bpy.context.view_layer.update()


def idle_at(t: float) -> dict[str, tuple[float, float, float]]:
    """t in [0, 1). Seamless if idle_at(0) == idle_at(1)."""
    s = math.sin(2 * math.pi * t)
    c = math.cos(2 * math.pi * t)
    return {
        "UpperArm_L": (48.0 + 1.4 * s, 0.0, 0.0),
        "UpperArm_R": (-48.0 - 1.4 * s, 0.0, 0.0),
        "LowerArm_L": (8.0 + 0.8 * s, 0.0, 0.0),
        "LowerArm_R": (-8.0 - 0.8 * s, 0.0, 0.0),
        "Shoulder_L": (1.2 * s, 0.0, 0.0),
        "Shoulder_R": (-1.2 * s, 0.0, 0.0),
        "Spine": (1.4 * s, 0.0, 0.45 * c),
        "Chest": (1.8 * s, 0.0, 0.35 * c),
    }


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = FPS
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = FRAMES

bpy.ops.import_scene.fbx(filepath=FBX, automatic_bone_orientation=True, use_image_search=False)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
arm.name = "Armature"
print("GARDENER bones", len(arm.data.bones), "scale", tuple(round(x, 4) for x in arm.scale))

if arm.animation_data:
    arm.animation_data.action = None
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)

bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
for b in list(arm.data.edit_bones):
    if b.name in BONE_MAP:
        b.name = BONE_MAP[b.name]
bpy.ops.object.mode_set(mode="OBJECT")

reset(arm)
report("REST", arm)
apply_euler(arm, idle_at(0))
report("IDLE t0", arm)

# Hands must sit near the hips, not T-pose, not through the torso.
hl = wpos(arm, "Hand_L")
hr = wpos(arm, "Hand_R")
hd = wpos(arm, "Head")
assert 0.14 < hl.x < 0.32, hl
assert -0.32 < hr.x < -0.14, hr
assert 0.78 < hl.z < 1.02, hl
assert 0.78 < hr.z < 1.02, hr
assert abs(hd.x) < 0.05 and abs(hd.y) < 0.05 and 1.52 < hd.z < 1.66, hd

act = bpy.data.actions.new("IDLE")
arm.animation_data_create()
arm.animation_data.action = act

keyed = [
    "UpperArm_L",
    "UpperArm_R",
    "LowerArm_L",
    "LowerArm_R",
    "Shoulder_L",
    "Shoulder_R",
    "Spine",
    "Chest",
]

for i in range(FRAMES):
    frame = 1 + i
    t = i / FRAMES
    apply_euler(arm, idle_at(t))
    for name in keyed:
        pb = arm.pose.bones[name]
        pb.rotation_mode = "QUATERNION"
        pb.keyframe_insert("rotation_quaternion", frame=frame)
        pb.keyframe_insert("location", frame=frame)

# Force seamless: copy frame 1 values onto a virtual wrap; last keyed frame
# is t=(FRAMES-1)/FRAMES, close to t=0. Also key frame FRAMES+1 = frame 1
# then we'll export 1..FRAMES with cyclic FCurves.
apply_euler(arm, idle_at(0))
for name in keyed:
    pb = arm.pose.bones[name]
    pb.rotation_mode = "QUATERNION"
    pb.keyframe_insert("rotation_quaternion", frame=FRAMES + 1)
    pb.keyframe_insert("location", frame=FRAMES + 1)

for fc in act.fcurves:
    fc.extrapolation = "LINEAR"
    for kp in fc.keyframe_points:
        kp.interpolation = "LINEAR"

report("IDLE f1", arm)
bpy.context.scene.frame_set(1 + FRAMES // 2)
bpy.context.view_layer.update()
report("IDLE mid", arm)

# Drop unused actions / objects except armature (exporter needs a skinned mesh
# sibling; keep gardener mesh, merge script copies animation only).
for a in list(bpy.data.actions):
    if a.name != "IDLE":
        bpy.data.actions.remove(a)

arm.animation_data.action = None
for t in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(t)
tr = arm.animation_data.nla_tracks.new()
tr.name = "IDLE"
tr.strips.new("IDLE", 1, act)

for o in list(bpy.data.objects):
    if o.type in {"EMPTY", "CAMERA", "LIGHT"}:
        bpy.data.objects.remove(o, do_unlink=True)

Path(OUT).parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    export_skins=True,
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_nla_strips=True,
    export_force_sampling=True,
    export_apply=False,
    export_cameras=False,
    export_lights=False,
    export_yup=True,
)
print("WROTE", OUT, "frames", FRAMES, "fps", FPS, "duration", FRAMES / FPS)
