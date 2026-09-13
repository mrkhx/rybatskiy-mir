#!/usr/bin/env python3
"""Bake Mixamo skeletal clips onto the production fisherman armature.

Method: align Mixamo T-pose yaw to the production T-pose, then Copy Rotation
in WORLD space and visual-bake. Mesh / weights / materials are not touched.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Vector

PROD = "/workspace/public/models/production/fisherman.glb"
OUT = "/tmp/fisherman_clips.glb"
MX = Path("/tmp/mixamo_extra")

MX_MAP = {
    "mixamorig:Hips": "Hips",
    "mixamorig:Spine": "Spine",
    "mixamorig:Spine1": "Spine1",
    "mixamorig:Spine2": "Chest",
    "mixamorig:Neck": "Neck",
    "mixamorig:Head": "Head",
    "mixamorig:LeftShoulder": "Shoulder_L",
    "mixamorig:RightShoulder": "Shoulder_R",
    "mixamorig:LeftArm": "UpperArm_L",
    "mixamorig:LeftForeArm": "LowerArm_L",
    "mixamorig:LeftHand": "Hand_L",
    "mixamorig:RightArm": "UpperArm_R",
    "mixamorig:RightForeArm": "LowerArm_R",
    "mixamorig:RightHand": "Hand_R",
    "mixamorig:LeftUpLeg": "UpperLeg_L",
    "mixamorig:LeftLeg": "LowerLeg_L",
    "mixamorig:LeftFoot": "Foot_L",
    "mixamorig:LeftToeBase": "Toe_L",
    "mixamorig:RightUpLeg": "UpperLeg_R",
    "mixamorig:RightLeg": "LowerLeg_R",
    "mixamorig:RightFoot": "Foot_R",
    "mixamorig:RightToeBase": "Toe_R",
}
for side, mx in (("L", "Left"), ("R", "Right")):
    for mix in ("Thumb", "Index", "Middle", "Ring", "Pinky"):
        for i in (1, 2, 3):
            MX_MAP[f"mixamorig:{mx}Hand{mix}{i}"] = f"{mix}_{side}_{i}"

KEEP = [
    "IDLE",
    "WALK",
    "READY",
    "AIM",
    "CAST_BACKSWING",
    "CAST_FORWARD",
    "CAST_FOLLOW",
    "WAIT",
    "BITE_REACTION",
    "HOOKSET",
    "REEL",
    "FIGHT_LIGHT",
    "FIGHT_HEAVY",
    "LAND",
    "RETURN_IDLE",
]


def wpos(arm, name):
    pb = arm.pose.bones[name]
    return (arm.matrix_world @ pb.matrix).to_translation()


def report(tag, arm):
    def f(n):
        if n not in arm.pose.bones:
            return "MISS"
        v = wpos(arm, n)
        return f"({v.x:5.2f},{v.y:5.2f},{v.z:5.2f})"

    print(tag, "Hips", f("Hips"), "HL", f("Hand_L"), "HR", f("Hand_R"), "FL", f("Foot_L"), "FR", f("Foot_R"))


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


def import_fbx(path):
    before_obj = set(bpy.data.objects)
    before_act = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=True, ignore_leaf_bones=False)
    new_obj = [o for o in bpy.data.objects if o not in before_obj]
    new_act = [a for a in bpy.data.actions if a not in before_act]
    arm = next(o for o in new_obj if o.type == "ARMATURE")
    fat = max(new_act, key=lambda a: len(a.fcurves))
    return arm, new_obj, fat


def hide(objs):
    for o in objs:
        try:
            o.hide_set(True)
            o.hide_viewport = True
            o.hide_render = True
        except Exception:
            pass


def compute_align(src, dst):
    """Yaw+translate Mixamo so its T-pose left-hand vector matches production."""
    clear_constraints(dst)
    to_rest(src)
    to_rest(dst)
    s_h = wpos(src, "mixamorig:Hips")
    d_h = wpos(dst, "Hips")
    s_l = wpos(src, "mixamorig:LeftHand") - s_h
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
    print("ALIGN", [round(x, 3) for x in q], "src HL", tuple(round(c, 2) for c in wpos(src, "mixamorig:LeftHand")),
          "dst HL", tuple(round(c, 2) for c in wpos(dst, "Hand_L")))


def add_copy(src, dst):
    clear_constraints(dst)
    for s, d in MX_MAP.items():
        if s not in src.pose.bones or d not in dst.pose.bones:
            continue
        c = dst.pose.bones[d].constraints.new("COPY_ROTATION")
        c.target = src
        c.subtarget = s
        c.target_space = "WORLD"
        c.owner_space = "WORLD"
        c.mix_mode = "REPLACE"
    hips = dst.pose.bones.get("Hips")
    if hips and "mixamorig:Hips" in src.pose.bones:
        cl = hips.constraints.new("COPY_LOCATION")
        cl.target = src
        cl.subtarget = "mixamorig:Hips"
        cl.use_x = False
        cl.use_y = False
        cl.use_z = True
        cl.target_space = "WORLD"
        cl.owner_space = "WORLD"


def shift_action_to_one(act):
    if not act.fcurves:
        return
    t0 = min(kp.co[0] for fc in act.fcurves for kp in fc.keyframe_points)
    if abs(t0 - 1.0) < 1e-4:
        return
    for fc in act.fcurves:
        for kp in fc.keyframe_points:
            kp.co[0] -= t0 - 1.0
            kp.handle_left[0] -= t0 - 1.0
            kp.handle_right[0] -= t0 - 1.0
        fc.update()


def bake_copy(src, src_act, dst, name, f0, f1, step=1):
    src.animation_data_create()
    src.animation_data.action = src_act
    add_copy(src, dst)
    if dst.animation_data:
        dst.animation_data.action = None
    bpy.context.view_layer.objects.active = dst
    dst.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.nla.bake(
        frame_start=int(f0),
        frame_end=int(f1),
        step=int(step),
        only_selected=False,
        visual_keying=True,
        clear_constraints=True,
        use_current_action=False,
        bake_types={"POSE"},
    )
    bpy.ops.object.mode_set(mode="OBJECT")
    act = dst.animation_data.action
    act.name = name
    shift_action_to_one(act)
    for fc in act.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    clear_constraints(dst)
    bpy.context.scene.frame_set(1)
    dst.animation_data.action = act
    bpy.context.view_layer.update()
    print(f"BAKED {name} src {f0}-{f1} step {step} fcurves {len(act.fcurves)}")
    report(f"  {name} f1", dst)
    return act


def snapshot_pose(arm):
    return {b.name: (b.location.copy(), b.rotation_quaternion.copy()) for b in arm.pose.bones}


def restore_pose(arm, snap):
    for name, (loc, rot) in snap.items():
        pb = arm.pose.bones.get(name)
        if not pb:
            continue
        pb.location = loc
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = rot


def pose_from_action(arm, act, frame=1):
    clear_constraints(arm)
    arm.animation_data_create()
    arm.animation_data.action = act
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    return snapshot_pose(arm)


def slerp_pose(arm, a, b, t):
    for name, (loc_a, rot_a) in a.items():
        pb = arm.pose.bones.get(name)
        if not pb or name not in b:
            continue
        loc_b, rot_b = b[name]
        pb.location = loc_a.lerp(loc_b, t)
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = rot_a.slerp(rot_b, t)


def key_pose(arm, frame):
    for pb in arm.pose.bones:
        pb.keyframe_insert("location", frame=frame)
        pb.rotation_mode = "QUATERNION"
        pb.keyframe_insert("rotation_quaternion", frame=frame)


def make_blend(dst, name, pose_a, pose_b, frames=22):
    if dst.animation_data:
        dst.animation_data.action = None
    act = bpy.data.actions.new(name)
    dst.animation_data_create()
    dst.animation_data.action = act
    for i in range(frames):
        t = i / max(1, frames - 1)
        te = t * t * (3 - 2 * t)
        slerp_pose(dst, pose_a, pose_b, te)
        key_pose(dst, 1 + i)
    for fc in act.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    print(f"BLEND {name} {frames}f")
    return act


def make_reel(dst, wait_pose, frames=36):
    """Cyclic left-arm crank on top of WAIT. No IK — runtime IK snaps the hand to the handle."""
    if dst.animation_data:
        dst.animation_data.action = None
    act = bpy.data.actions.new("REEL")
    dst.animation_data_create()
    dst.animation_data.action = act
    for i in range(frames):
        restore_pose(dst, wait_pose)
        t = (2 * math.pi * i) / frames
        for name, xyz in (
            ("UpperArm_L", (6 * math.sin(t), 4 * math.cos(t), 0)),
            ("LowerArm_L", (0, 8 * math.sin(t), 16 * math.cos(t))),
            ("Hand_L", (10 * math.cos(t), 0, 8 * math.sin(t))),
            ("Shoulder_L", (2 * math.sin(t), 0, 0)),
        ):
            pb = dst.pose.bones.get(name)
            if not pb:
                continue
            extra = Euler((math.radians(xyz[0]), math.radians(xyz[1]), math.radians(xyz[2])), "XYZ").to_quaternion()
            pb.rotation_mode = "QUATERNION"
            pb.rotation_quaternion = pb.rotation_quaternion @ extra
        key_pose(dst, 1 + i)
    for fc in act.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    print(f"REEL {frames}f fcurves {len(act.fcurves)}")
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    report("  REEL f1", dst)
    return act


# ---------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30
bpy.context.scene.frame_start = 1

bpy.ops.import_scene.gltf(filepath=PROD)
dst = next(o for o in bpy.data.objects if o.type == "ARMATURE")
dst.name = "Armature"
print("DST bones", len(dst.data.bones))
if dst.animation_data:
    dst.animation_data.action = None
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
clear_constraints(dst)
to_rest(dst)
report("DST TPOSE", dst)

actions = {}

src, extras, src_act = import_fbx(MX / "Happy_Idle.fbx")
compute_align(src, dst)
src.animation_data_create()
src.animation_data.action = src_act
f0, f1 = int(src_act.frame_range[0]), int(src_act.frame_range[1])
actions["IDLE"] = bake_copy(src, src_act, dst, "IDLE", f0, f1)
hide(extras)

src_w, extras_w, walk_act = import_fbx(MX / "Walking.fbx")
compute_align(src_w, dst)
actions["WALK"] = bake_copy(src_w, walk_act, dst, "WALK", int(walk_act.frame_range[0]), int(walk_act.frame_range[1]))
hide(extras_w)

src_fi, extras_fi, fi_act = import_fbx(MX / "Fishing_Idle.fbx")
compute_align(src_fi, dst)
fr0, fr1 = int(fi_act.frame_range[0]), int(fi_act.frame_range[1])
actions["WAIT"] = bake_copy(src_fi, fi_act, dst, "WAIT", fr0, fr1)
actions["READY"] = bake_copy(src_fi, fi_act, dst, "READY", fr0, fr1, step=2)
hide(extras_fi)

src_c, extras_c, c_act = import_fbx(MX / "Fishing_Cast.fbx")
compute_align(src_c, dst)
actions["AIM"] = bake_copy(src_c, c_act, dst, "AIM", 201, 233)
actions["CAST_BACKSWING"] = bake_copy(src_c, c_act, dst, "CAST_BACKSWING", 9, 49)
actions["CAST_FORWARD"] = bake_copy(src_c, c_act, dst, "CAST_FORWARD", 49, 73)
actions["CAST_FOLLOW"] = bake_copy(src_c, c_act, dst, "CAST_FOLLOW", 73, 137)
actions["HOOKSET"] = bake_copy(src_c, c_act, dst, "HOOKSET", 9, 41)
actions["FIGHT_LIGHT"] = bake_copy(src_c, c_act, dst, "FIGHT_LIGHT", 145, 201)
actions["FIGHT_HEAVY"] = bake_copy(src_c, c_act, dst, "FIGHT_HEAVY", 65, 113)
hide(extras_c)

src_h, extras_h, h_act = import_fbx(MX / "Hit_Reaction.fbx")
compute_align(src_h, dst)
actions["BITE_REACTION"] = bake_copy(src_h, h_act, dst, "BITE_REACTION", 1, 40)
hide(extras_h)

src_p, extras_p, p_act = import_fbx(MX / "Picking_Up.fbx")
compute_align(src_p, dst)
actions["LAND"] = bake_copy(src_p, p_act, dst, "LAND", 48, 180, step=2)
hide(extras_p)

idle_pose = pose_from_action(dst, actions["IDLE"], 1)
wait_pose = pose_from_action(dst, actions["WAIT"], 8)
actions["RETURN_IDLE"] = make_blend(dst, "RETURN_IDLE", wait_pose, idle_pose, frames=22)
actions["REEL"] = make_reel(dst, wait_pose, frames=36)

for o in list(bpy.data.objects):
    if o != dst:
        bpy.data.objects.remove(o, do_unlink=True)

for a in list(bpy.data.actions):
    if a.name not in KEEP:
        bpy.data.actions.remove(a)

dst.animation_data_create()
dst.animation_data.action = None
for t in list(dst.animation_data.nla_tracks):
    dst.animation_data.nla_tracks.remove(t)
for name in KEEP:
    act = bpy.data.actions.get(name)
    if not act:
        print("MISSING ACTION", name)
        continue
    tr = dst.animation_data.nla_tracks.new()
    tr.name = name
    tr.strips.new(name, int(act.frame_range[0]), act)

print("ACTIONS", [a.name for a in bpy.data.actions])
print("NLA", [t.name for t in dst.animation_data.nla_tracks])

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
