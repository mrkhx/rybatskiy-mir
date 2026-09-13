#!/usr/bin/env python3
"""Static READY: two-hand spinning hold.

Offline IK to waist-front targets. Bake visual. a1 inspected after bake.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector, Euler

FBX = "/tmp/rocketbox/Gardener_Male_01/Export/Gardener_Male_01.fbx"
OUT = "/tmp/ready_baked.glb"
FPS = 30

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

CURL = {
    "Thumb_R_1": (0.12, 0.22, 0.08),
    "Thumb_R_2": (0.06, 0.16, 0.03),
    "Thumb_R_3": (0.03, 0.10, 0.0),
    "Index_R_1": (0.0, 0.0, 0.50),
    "Index_R_2": (0.0, 0.0, 0.65),
    "Index_R_3": (0.0, 0.0, 0.40),
    "Middle_R_1": (0.0, 0.0, 0.55),
    "Middle_R_2": (0.0, 0.0, 0.70),
    "Middle_R_3": (0.0, 0.0, 0.40),
    "Ring_R_1": (0.0, 0.0, 0.50),
    "Ring_R_2": (0.0, 0.0, 0.62),
    "Ring_R_3": (0.0, 0.0, 0.36),
    "Pinky_R_1": (0.0, 0.0, 0.45),
    "Pinky_R_2": (0.0, 0.0, 0.55),
    "Pinky_R_3": (0.0, 0.0, 0.30),
}
for k, v in list(CURL.items()):
    CURL[k.replace("_R_", "_L_")] = v


def blender_to_gltf(v: Vector) -> Vector:
    return Vector((v.x, v.z, -v.y))


def gltf_to_blender(v: Vector) -> Vector:
    return Vector((v.x, -v.z, v.y))


def wpos(arm, n):
    return (arm.matrix_world @ arm.pose.bones[n].matrix).to_translation()


def gpos(arm, n):
    return blender_to_gltf(wpos(arm, n))


def report(tag, arm):
    def f(n):
        v = gpos(arm, n)
        return f"{n}({v.x:5.2f},{v.y:5.2f},{v.z:5.2f})"

    print(tag, f("Hand_L"), f("Hand_R"), f("Head"), f("LowerArm_L"), f("LowerArm_R"))


def empty(name, loc):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = 0.03
    o.location = loc
    bpy.context.collection.objects.link(o)
    return o


def reset(arm):
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    bpy.context.view_layer.update()


def set_euler(arm, pose):
    for name, xyz in pose.items():
        pb = arm.pose.bones.get(name)
        if not pb:
            continue
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = Euler([math.radians(a) for a in xyz], "XYZ")
    bpy.context.view_layer.update()


SEED = {
    "Shoulder_L": (5.0, -6.0, 5.0),
    "Shoulder_R": (-5.0, 6.0, 5.0),
    "Chest": (0.0, 0.0, -3.0),
    "Spine": (0.0, 0.0, -2.0),
    "Neck": (0.0, 0.0, 2.0),
    "Hips": (2.0, 0.0, 0.0),
    "UpperLeg_L": (2.0, 0.0, -5.0),
    "LowerLeg_L": (0.0, 0.0, -8.0),
    "UpperLeg_R": (-1.0, 0.0, -2.0),
    "LowerLeg_R": (0.0, 0.0, -4.0),
    "UpperArm_L": (20.0, 0.0, 26.0),
    "LowerArm_L": (6.0, 0.0, 38.0),
    "UpperArm_R": (-14.0, 0.0, 30.0),
    "LowerArm_R": (-6.0, 0.0, 34.0),
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = FPS
bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = 2

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
set_euler(arm, SEED)
report("SEED", arm)

# glTF man-local targets: +X left, +Y up, +Z forward.
tgt_r = empty("RightGripTarget", gltf_to_blender(Vector((-0.05, 1.01, 0.27))))
tgt_l = empty("RearGripTarget", gltf_to_blender(Vector((0.02, 0.97, 0.12))))
pole_r = empty("Pole_R", Vector((-0.40, 0.25, 0.88)))
pole_l = empty("Pole_L", Vector((0.40, 0.25, 0.88)))

for side, tgt, pole in (("R", tgt_r, pole_r), ("L", tgt_l, pole_l)):
    for bone_n in (f"UpperArm_{side}", f"LowerArm_{side}"):
        pb = arm.pose.bones[bone_n]
        pb.lock_ik_y = True
        pb.ik_stiffness_y = 0.95
    hand = arm.pose.bones[f"Hand_{side}"]
    c = hand.constraints.new("IK")
    c.target = tgt
    c.pole_target = pole
    c.chain_count = 3
    c.iterations = 300
    c.use_tail = True

for _ in range(10):
    bpy.context.view_layer.update()
report("IK", arm)

for name, xyz in CURL.items():
    pb = arm.pose.bones.get(name)
    if not pb:
        continue
    pb.rotation_mode = "XYZ"
    pb.rotation_euler = Euler(xyz, "XYZ")
bpy.context.view_layer.update()

bpy.context.view_layer.objects.active = arm
for o in bpy.data.objects:
    o.select_set(o == arm)
bpy.ops.object.mode_set(mode="POSE")
bpy.ops.pose.select_all(action="SELECT")
bpy.ops.nla.bake(
    frame_start=1,
    frame_end=2,
    step=1,
    only_selected=False,
    visual_keying=True,
    clear_constraints=True,
    use_current_action=False,
    bake_types={"POSE"},
)
bpy.ops.object.mode_set(mode="OBJECT")
act = arm.animation_data.action
act.name = "READY"
report("BAKED", arm)
for n in ("UpperArm_L", "UpperArm_R", "LowerArm_L", "LowerArm_R", "Hand_L", "Hand_R"):
    pb = arm.pose.bones[n]
    e = pb.matrix_basis.to_euler("XYZ")
    print(n, "euler", [round(math.degrees(a), 1) for a in e])

hl, hr = gpos(arm, "Hand_L"), gpos(arm, "Hand_R")
d = hr - hl
print("HAND delta gltf", tuple(round(c, 3) for c in d), "dist", round(d.length, 3))
print("yaw deg", round(math.degrees(math.atan2(-d.x, d.z)), 1), "pitch", round(math.degrees(math.asin(d.y / (d.length or 1))), 1))

for o in list(bpy.data.objects):
    if o.type in {"EMPTY", "CAMERA", "LIGHT"}:
        bpy.data.objects.remove(o, do_unlink=True)

arm.animation_data.action = None
for t in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(t)
tr = arm.animation_data.nla_tracks.new()
tr.name = "READY"
tr.strips.new("READY", 1, act)
arm.animation_data.action = act

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
print("WROTE", OUT)
