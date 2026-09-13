#!/usr/bin/env python3
"""Bake READY from gardener rest, local bone space only.

No IK, no WORLD copy, no Mixamo, no Hand keys.

Gardener rest after automatic_bone_orientation (documented):
  Bone Y = length axis (head→tail).
  UpperArm a1 = humerus TWIST  — always 0.
  UpperArm a0 = drop from T-pose (L+, R−).
  UpperArm a2 = shoulder flexion forward (L+ and R+).
  LowerArm a2 = elbow flexion forward (L+ and R+).
  LowerArm a0 = slight in-plane assist (L+, R−).
  Hand stays at bind so the wrist continues the forearm.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Euler

FBX = "/tmp/rocketbox/Gardener_Male_01/Export/Gardener_Male_01.fbx"
OUT = "/tmp/ready_baked.glb"
FPS = 30
FRAMES = 105

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

# Joint limits in local Euler degrees relative to bind.
LIMITS = {
    "UpperArm_L": {"x": (0, 42), "y": (0, 0), "z": (0, 38)},
    "UpperArm_R": {"x": (-45, 0), "y": (0, 0), "z": (0, 35)},
    "LowerArm_L": {"x": (0, 12), "y": (0, 0), "z": (0, 40)},
    "LowerArm_R": {"x": (-12, 0), "y": (0, 0), "z": (0, 40)},
    "Shoulder_L": {"x": (0, 10), "y": (-12, 0), "z": (0, 10)},
    "Shoulder_R": {"x": (-10, 0), "y": (0, 12), "z": (0, 10)},
}


def clamp_pose(pose: dict[str, tuple[float, float, float]]) -> dict[str, tuple[float, float, float]]:
    out = {}
    for name, xyz in pose.items():
        lim = LIMITS.get(name)
        if not lim:
            out[name] = xyz
            continue
        x, y, z = xyz
        x = min(lim["x"][1], max(lim["x"][0], x))
        y = min(lim["y"][1], max(lim["y"][0], y))
        z = min(lim["z"][1], max(lim["z"][0], z))
        out[name] = (x, y, z)
    return out


def ready_at(t: float) -> dict[str, tuple[float, float, float]]:
    """t in [0,1). Increment from accepted IDLE, no humerus twist, no wrist keys."""
    s = math.sin(2 * math.pi * t)
    c = math.cos(2 * math.pi * t)
    # IDLE used UpperArm (33, 0, 12) / (-33, 0, 12) and LowerArm (4, 0, 20).
    # READY: less drop, more forward flexion, more elbow — still a1=0.
    # Right arm stays the accepted no-rod READY (grip).
    # Left: extra forward flexion + elbow so the hand sits along a
    # forward-and-up blank. UpperArm a1 stays 0 (no humerus twist).
    return clamp_pose(
        {
            "UpperArm_L": (28.0 + 1.0 * s, 0.0, 32.0),
            "UpperArm_R": (-24.0 - 1.0 * s, 0.0, 20.0),
            "LowerArm_L": (6.0 + 0.5 * s, 0.0, 36.0),
            "LowerArm_R": (-6.0 - 0.5 * s, 0.0, 28.0),
            "Shoulder_L": (5.0 + 0.8 * s, -8.0, 5.0),
            "Shoulder_R": (-5.0 - 0.8 * s, 6.0, 4.0),
            "Chest": (0.0, 0.0, -6.0 + 1.2 * s),
            "Spine": (0.0, 0.0, -3.0 + 0.6 * c),
            "Neck": (0.0, 0.0, 3.0 + 1.0 * c),
            "Hips": (3.0 + 0.8 * s, 20.0, 0.0),
            "UpperLeg_L": (2.0, 0.0, -5.0),
            "LowerLeg_L": (0.0, 0.0, -8.0 + 1.2 * s),
            "UpperLeg_R": (-1.0, 0.0, -2.0),
            "LowerLeg_R": (0.0, 0.0, -4.0 + 0.6 * s),
        }
    )


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
        "EL",
        fmt("LowerArm_L"),
        "ER",
        fmt("LowerArm_R"),
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


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = FPS
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = FRAMES

bpy.ops.import_scene.fbx(filepath=FBX, automatic_bone_orientation=True, use_image_search=False)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
arm.name = "Armature"
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
apply_euler(arm, ready_at(0))
report("READY t0", arm)

hl = wpos(arm, "Hand_L")
hr = wpos(arm, "Hand_R")
hd = wpos(arm, "Head")
# Hands in front of the torso, not through it, not in T-pose.
assert hl.y < -0.10 and hr.y < -0.10, (hl, hr)
assert 0.04 < hl.x < 0.40, hl
assert -0.45 < hr.x < 0.05, hr
assert 0.85 < hl.z < 1.15, hl
assert 0.85 < hr.z < 1.15, hr
assert abs(hd.x) < 0.12 and hd.z > 1.50, hd
# No wrist keys: Hand matrix_basis must stay identity.
assert arm.pose.bones["Hand_L"].matrix_basis.to_euler("XYZ").x == 0
assert arm.pose.bones["Hand_R"].matrix_basis.to_euler("XYZ").x == 0
# No humerus twist.
assert abs(arm.pose.bones["UpperArm_L"].rotation_euler.y) < 1e-6
assert abs(arm.pose.bones["UpperArm_R"].rotation_euler.y) < 1e-6

keyed = [
    "UpperArm_L",
    "UpperArm_R",
    "LowerArm_L",
    "LowerArm_R",
    "Shoulder_L",
    "Shoulder_R",
    "Spine",
    "Chest",
    "Neck",
    "Hips",
    "UpperLeg_L",
    "LowerLeg_L",
    "UpperLeg_R",
    "LowerLeg_R",
]

act = bpy.data.actions.new("READY")
arm.animation_data_create()
arm.animation_data.action = act

for i in range(FRAMES):
    frame = 1 + i
    apply_euler(arm, ready_at(i / FRAMES))
    for name in keyed:
        pb = arm.pose.bones[name]
        pb.rotation_mode = "QUATERNION"
        pb.keyframe_insert("rotation_quaternion", frame=frame)
        pb.keyframe_insert("location", frame=frame)

apply_euler(arm, ready_at(0))
for name in keyed:
    pb = arm.pose.bones[name]
    pb.rotation_mode = "QUATERNION"
    pb.keyframe_insert("rotation_quaternion", frame=FRAMES + 1)
    pb.keyframe_insert("location", frame=FRAMES + 1)

for fc in act.fcurves:
    for kp in fc.keyframe_points:
        kp.interpolation = "LINEAR"

bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
report("READY f1", arm)

arm.animation_data.action = None
for t in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(t)
tr = arm.animation_data.nla_tracks.new()
tr.name = "READY"
tr.strips.new("READY", 1, act)

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
print("WROTE", OUT, "frames", FRAMES, "fps", FPS)
print("AXES UpperArm Y=twist locked 0; a0=drop; a2=forward; LowerArm a2=elbow; Hand=bind")
