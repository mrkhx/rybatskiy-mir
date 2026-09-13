#!/usr/bin/env python3
"""Bake READY on the gardener Bip01 armature (same import as production).

Offline two-hand IK toward fishing-ready targets, then visual bake to local
keys. No WORLD copy, no Mixamo, no mesh export into production.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Euler, Vector

FBX = "/tmp/rocketbox/Gardener_Male_01/Export/Gardener_Male_01.fbx"
OUT = "/tmp/ready_baked.glb"
FPS = 30
FRAMES = 105  # 3.5s

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

# Gardener space: +X left, -Y forward, +Z up.
# Right hand = grip (near right hip/navel, in front).
# Left hand = support (further forward, slightly higher, toward the blank).
GRIP = Vector((-0.20, -0.22, 1.00))
SUPPORT = Vector((-0.10, -0.50, 1.12))
POLE_R = Vector((-0.45, -0.05, 0.95))
POLE_L = Vector((0.20, -0.15, 1.05))

BODY = {
    "Chest": (0.0, 0.0, -5.0),
    "Spine": (0.0, 0.0, -2.0),
    "Neck": (0.0, 0.0, 4.0),
    "Hips": (3.0, -1.0, 0.0),
    "UpperLeg_L": (2.0, 0.0, -5.0),
    "LowerLeg_L": (0.0, 0.0, -8.0),
    "UpperLeg_R": (-1.0, 0.0, -2.0),
    "LowerLeg_R": (0.0, 0.0, -4.0),
    "Shoulder_L": (6.0, -8.0, 6.0),
    "Shoulder_R": (-4.0, 8.0, 4.0),
}


def wpos(arm, n):
    return (arm.matrix_world @ arm.pose.bones[n].matrix).to_translation()


def report(tag, arm):
    def fmt(n):
        v = wpos(arm, n)
        return f"({v.x:5.2f},{v.y:5.2f},{v.z:5.2f})"

    hl, hr = wpos(arm, "Hand_L"), wpos(arm, "Hand_R")
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
        f"dY {hl.y - hr.y:+.2f} dZ {hl.z - hr.z:+.2f} sep {(hl - hr).length:.2f}",
    )


def reset(arm):
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    bpy.context.view_layer.update()


def apply_euler(arm, pose_deg):
    for name, xyz in pose_deg.items():
        pb = arm.pose.bones.get(name)
        if not pb:
            continue
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = Euler([math.radians(v) for v in xyz], "XYZ")
    bpy.context.view_layer.update()


def empty_at(name, loc):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = 0.05
    o.location = loc
    bpy.context.collection.objects.link(o)
    return o


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
bpy.ops.object.mode_set(mode="POSE")

reset(arm)
apply_euler(arm, BODY)
report("BODY", arm)

grip = empty_at("GripTarget", GRIP)
support = empty_at("SupportTarget", SUPPORT)
pole_r = empty_at("PoleR", POLE_R)
pole_l = empty_at("PoleL", POLE_L)


def add_ik(bone, target, pole, chain=2):
    pb = arm.pose.bones[bone]
    c = pb.constraints.new("IK")
    c.target = target
    c.chain_count = chain
    c.use_tail = True
    c.pole_target = pole
    c.pole_angle = math.pi
    c.iterations = 20
    return c


add_ik("LowerArm_R", grip, pole_r, 2)
add_ik("LowerArm_L", support, pole_l, 2)
bpy.context.view_layer.update()
report("IK t0", arm)

keyed = [
    "Hips",
    "Spine",
    "Spine1",
    "Chest",
    "Neck",
    "Shoulder_L",
    "Shoulder_R",
    "UpperArm_L",
    "LowerArm_L",
    "Hand_L",
    "UpperArm_R",
    "LowerArm_R",
    "Hand_R",
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
    t = i / FRAMES
    s = math.sin(2 * math.pi * t)
    c = math.cos(2 * math.pi * t)
    # Tiny living motion on the targets and the body.
    grip.location = GRIP + Vector((0.004 * c, 0.006 * s, 0.010 * s))
    support.location = SUPPORT + Vector((0.005 * s, 0.008 * c, 0.012 * s))
    body = {
        "Chest": (0.0, 0.0, -5.0 + 1.2 * s),
        "Spine": (0.0, 0.0, -2.0 + 0.6 * c),
        "Neck": (0.0, 0.0, 4.0 + 1.0 * c),
        "Hips": (3.0 + 0.8 * s, -1.0, 0.0),
        "UpperLeg_L": (2.0, 0.0, -5.0),
        "LowerLeg_L": (0.0, 0.0, -8.0 + 1.2 * s),
        "UpperLeg_R": (-1.0, 0.0, -2.0),
        "LowerLeg_R": (0.0, 0.0, -4.0 + 0.6 * s),
        "Shoulder_L": (6.0 + 0.8 * s, -8.0, 6.0),
        "Shoulder_R": (-4.0 - 0.8 * s, 8.0, 4.0),
    }
    apply_euler(arm, body)
    bpy.context.view_layer.update()
    bpy.context.scene.frame_set(frame)
    for name in keyed:
        pb = arm.pose.bones[name]
        pb.rotation_mode = "QUATERNION"
        pb.keyframe_insert("rotation_quaternion", frame=frame)
        pb.keyframe_insert("location", frame=frame)

# Bake visual so keys are the IK result, then drop constraints.
bpy.ops.nla.bake(
    frame_start=1,
    frame_end=FRAMES + 1,
    only_selected=False,
    visual_keying=True,
    clear_constraints=True,
    use_current_action=True,
    bake_types={"POSE"},
)

# Seamless wrap
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
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
report("BAKED f1", arm)
bpy.context.scene.frame_set(1 + FRAMES // 2)
bpy.context.view_layer.update()
report("BAKED mid", arm)

hl = wpos(arm, "Hand_L")
hr = wpos(arm, "Hand_R")
hd = wpos(arm, "Head")
assert hl.y < hr.y - 0.08, (hl, hr)  # left more forward
assert hl.z > hr.z + 0.04, (hl, hr)  # left slightly higher
assert hr.z > 0.85 and hr.z < 1.15, hr
assert hd.z > 1.50, hd

for o in list(bpy.data.objects):
    if o.type in {"EMPTY", "CAMERA", "LIGHT"} and o is not arm:
        bpy.data.objects.remove(o, do_unlink=True)

arm.animation_data.action = None
for t in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(t)
tr = arm.animation_data.nla_tracks.new()
tr.name = "READY"
tr.strips.new("READY", 1, act)

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
