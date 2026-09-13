#!/usr/bin/env python3
"""Bake Rocketbox walk_neutral onto the production fisherman armature.

Uses the same WORLD-copy path as Mixamo clips so WALK faces the same way as
IDLE/WAIT. Mesh, weights and materials of the production GLB are not modified.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

PROD = "/workspace/public/models/production/fisherman.glb"
WALK_FBX = "/tmp/anims/walk_neutral.fbx"
OUT = "/tmp/walk_native.glb"

SRC_TO_DST = {
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
for side, pref, dst in (("L", "Bip01 L", "L"), ("R", "Bip01 R", "R")):
    for i, name in enumerate(FINGER):
        SRC_TO_DST[f"{pref} Finger{i}"] = f"{name}_{dst}_1"
        SRC_TO_DST[f"{pref} Finger{i}1"] = f"{name}_{dst}_2"
        SRC_TO_DST[f"{pref} Finger{i}2"] = f"{name}_{dst}_3"


def wpos(arm, n):
    return (arm.matrix_world @ arm.pose.bones[n].matrix).to_translation()


def knee(arm, th, ca, fo):
    t = wpos(arm, th)
    c = wpos(arm, ca)
    f = wpos(arm, fo)
    a = (t - c).normalized()
    b = (f - c).normalized()
    return math.degrees(a.angle(b))


def report(tag, arm, names):
    th, ca, fo, thR, caR, foR, hips = names
    h = wpos(arm, hips)
    fl = wpos(arm, fo)
    fr = wpos(arm, foR)
    print(
        f"{tag} kneeL={knee(arm, th, ca, fo):6.1f} kneeR={knee(arm, thR, caR, foR):6.1f}"
        f" hips=({h.x:5.2f},{h.y:5.2f},{h.z:5.2f})"
        f" FL=({fl.x:5.2f},{fl.y:5.2f},{fl.z:5.2f}) FR=({fr.x:5.2f},{fr.y:5.2f},{fr.z:5.2f})"
    )


def clear_constraints(arm):
    for pb in arm.pose.bones:
        for c in list(pb.constraints):
            pb.constraints.remove(c)


def to_rest(arm):
    if arm.animation_data:
        arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    bpy.context.view_layer.update()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30

bpy.ops.import_scene.gltf(filepath=PROD)
dst = next(o for o in bpy.data.objects if o.type == "ARMATURE")
dst.name = "Armature"
if dst.animation_data:
    dst.animation_data.action = None
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
clear_constraints(dst)
to_rest(dst)
print("DST bones", len(dst.data.bones))
DST_N = ("UpperLeg_L", "LowerLeg_L", "Foot_L", "UpperLeg_R", "LowerLeg_R", "Foot_R", "Hips")
report("DST TPOSE", dst, DST_N)

before_obj = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=WALK_FBX, automatic_bone_orientation=True)
src = next(o for o in bpy.data.objects if o.type == "ARMATURE" and o not in before_obj)
src_act = src.animation_data.action
print("SRC", src.name, "act", src_act.name, tuple(src_act.frame_range), "fcurves", len(src_act.fcurves))
SRC_N = ("Bip01 L Thigh", "Bip01 L Calf", "Bip01 L Foot", "Bip01 R Thigh", "Bip01 R Calf", "Bip01 R Foot", "Bip01 Pelvis")

# Align source T-pose yaw to production T-pose (same method as Mixamo clips).
clear_constraints(dst)
to_rest(src)
to_rest(dst)
s_h = wpos(src, "Bip01 Pelvis")
d_h = wpos(dst, "Hips")
s_l = wpos(src, "Bip01 L Hand") - s_h
d_l = wpos(dst, "Hand_L") - d_h
s_l.z = 0
d_l.z = 0
s_l.normalize()
d_l.normalize()
q = s_l.rotation_difference(d_l)
R = q.to_matrix().to_4x4()
T1 = Matrix.Translation(s_h)
T0 = Matrix.Translation(-s_h)
src.matrix_world = Matrix.Translation(d_h - s_h) @ T1 @ R @ T0 @ src.matrix_world
bpy.context.view_layer.update()
print("ALIGN q", [round(x, 3) for x in q])
print("  src HL", tuple(round(c, 2) for c in wpos(src, "Bip01 L Hand")), "dst HL", tuple(round(c, 2) for c in wpos(dst, "Hand_L")))

src.animation_data_create()
src.animation_data.action = src_act

clear_constraints(dst)
copied = 0
for s_name, d_name in SRC_TO_DST.items():
    if s_name not in src.pose.bones or d_name not in dst.pose.bones:
        continue
    c = dst.pose.bones[d_name].constraints.new("COPY_ROTATION")
    c.target = src
    c.subtarget = s_name
    c.target_space = "WORLD"
    c.owner_space = "WORLD"
    c.mix_mode = "REPLACE"
    copied += 1
hips = dst.pose.bones.get("Hips")
if hips and "Bip01 Pelvis" in src.pose.bones:
    cl = hips.constraints.new("COPY_LOCATION")
    cl.target = src
    cl.subtarget = "Bip01 Pelvis"
    cl.target_space = "WORLD"
    cl.owner_space = "WORLD"
print("CONSTRAINTS", copied)

print("PRE-BAKE:")
for fr in (1, 9, 17, 25):
    bpy.context.scene.frame_set(fr)
    bpy.context.view_layer.update()
    report(f"  src f{fr}", src, SRC_N)
    report(f"  dst f{fr}", dst, DST_N)

f0, f1 = int(src_act.frame_range[0]), int(src_act.frame_range[1])
bpy.context.view_layer.objects.active = dst
for o in bpy.data.objects:
    o.select_set(o == dst)
bpy.ops.object.mode_set(mode="POSE")
bpy.ops.pose.select_all(action="SELECT")
bpy.ops.nla.bake(
    frame_start=f0,
    frame_end=f1,
    step=1,
    only_selected=False,
    visual_keying=True,
    clear_constraints=True,
    use_current_action=False,
    bake_types={"POSE"},
)
bpy.ops.object.mode_set(mode="OBJECT")
baked = dst.animation_data.action
baked.name = "WALK"
print("BAKED", tuple(baked.frame_range), "fcurves", len(baked.fcurves))

dst.animation_data.action = baked
bpy.context.scene.frame_set(f0)
bpy.context.view_layer.update()
origin = wpos(dst, "Hips").copy()
print("ORIGIN", tuple(round(x, 3) for x in origin))

pelvis = dst.pose.bones["Hips"]
parent_bone = pelvis.parent
for fr in range(f0, f1 + 1):
    bpy.context.scene.frame_set(fr)
    bpy.context.view_layer.update()
    world_mat = dst.matrix_world @ pelvis.matrix
    rot = world_mat.to_quaternion()
    pos = world_mat.to_translation()
    pos.x = origin.x
    pos.y = origin.y
    parent_mw = dst.matrix_world if parent_bone is None else (dst.matrix_world @ parent_bone.matrix)
    world_fixed = rot.to_matrix().to_4x4()
    world_fixed.translation = pos
    local_mat = parent_mw.inverted() @ world_fixed
    rest = dst.data.bones[pelvis.name].matrix_local.copy()
    if parent_bone is not None:
        rest = parent_bone.bone.matrix_local.inverted() @ dst.data.bones[pelvis.name].matrix_local
    basis = rest.inverted() @ local_mat
    pelvis.location = basis.to_translation()
    pelvis.rotation_mode = "QUATERNION"
    pelvis.rotation_quaternion = basis.to_quaternion()
    pelvis.keyframe_insert("location", frame=fr)
    pelvis.keyframe_insert("rotation_quaternion", frame=fr)

print("IN-PLACE:")
dst.animation_data.action = baked
for fr in (f0, 9, 17, f1):
    bpy.context.scene.frame_set(fr)
    bpy.context.view_layer.update()
    report(f"  f{fr}", dst, DST_N)

for o in list(bpy.data.objects):
    if o != dst:
        bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions):
    if a.name != "WALK":
        bpy.data.actions.remove(a)

act = bpy.data.actions["WALK"]
dst.animation_data_create()
dst.animation_data.action = None
for t in list(dst.animation_data.nla_tracks):
    dst.animation_data.nla_tracks.remove(t)
tr = dst.animation_data.nla_tracks.new()
tr.name = "WALK"
tr.strips.new("WALK", int(act.frame_range[0]), act)
dst.animation_data.action = act

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
