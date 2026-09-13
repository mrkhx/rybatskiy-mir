#!/usr/bin/env python3
"""Author a production spinning rod: tapered skinned blank, cork handle, reel, guides."""
import math
from pathlib import Path

import bpy
from mathutils import Vector

OUT = "/workspace/public/models/production/rod.glb"


def mat(name, color, rough=0.45, metal=0.0, spec=0.4):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return m


def add_cyl(name, radius, depth, loc, rot=(0, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o


def add_torus(name, major, minor, loc, rot=(math.pi / 2, 0, 0), major_seg=18, minor_seg=8):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major, minor_radius=minor, major_segments=major_seg, minor_segments=minor_seg, location=loc
    )
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o


def add_uvsphere(name, r, loc, seg=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg)
    o = bpy.context.active_object
    o.name = name
    return o


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def empty(name, loc, parent=None):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=loc)
    o = bpy.context.active_object
    o.name = name
    o.empty_display_size = 0.03
    if parent:
        o.parent = parent
    return o


bpy.ops.wm.read_factory_settings(use_empty=True)

cork = mat("cork", (0.55, 0.42, 0.28), rough=0.82)
graphite = mat("graphite", (0.12, 0.13, 0.14), rough=0.38, metal=0.15)
seat = mat("seat", (0.08, 0.08, 0.09), rough=0.4, metal=0.25)
chrome = mat("chrome", (0.72, 0.74, 0.76), rough=0.22, metal=0.85)
reel_body = mat("reel_body", (0.18, 0.19, 0.21), rough=0.35, metal=0.45)
line_spool = mat("spool", (0.42, 0.18, 0.12), rough=0.55, metal=0.05)
grip_tape = mat("tape", (0.16, 0.17, 0.16), rough=0.7)

# Axis: rod along +Y (Blender), grip at origin. Export Y-up glTF → along +Z? 
# Keep along +Y in Blender; glTF Y-up conversion maps Blender Y → glTF Z? 
# Blender Y-forward, Z-up. We want rod along local +Y so when parented to hand it points out.
# Use +Y as blank direction, grip at y=0.

handle = add_cyl("Handle", 0.0135, 0.26, (0, 0.13, 0), verts=28)
handle.data.materials.append(cork)
# cork rings
rings = [handle]
for i, y in enumerate((0.04, 0.09, 0.14, 0.19, 0.24)):
    r = add_cyl(f"CorkRing{i}", 0.0142, 0.008, (0, y, 0), verts=24)
    r.data.materials.append(grip_tape)
    rings.append(r)
butt = add_uvsphere("ButtCap", 0.014, (0, 0.0, 0), 20)
butt.data.materials.append(chrome)
rings.append(butt)
reel_seat = add_cyl("ReelSeat", 0.0115, 0.09, (0, 0.31, 0), verts=24)
reel_seat.data.materials.append(seat)
rings.append(reel_seat)
fore = add_cyl("Foregrip", 0.011, 0.07, (0, 0.38, 0), verts=24)
fore.data.materials.append(cork)
rings.append(fore)
handle_grp = join(rings, "HandleMesh")

# Tapered blank: many stacked cylinders, then joined and skinned
blank_len = 1.72
n_bones = 10
segs = 18
blank_parts = []
for i in range(segs):
    t0 = i / segs
    t1 = (i + 1) / segs
    y = 0.42 + (t0 + t1) * 0.5 * blank_len
    r = 0.0078 * (1.0 - 0.82 * ((t0 + t1) * 0.5))
    h = blank_len / segs + 0.001
    p = add_cyl(f"BlankSeg{i}", max(0.0016, r), h, (0, y, 0), verts=16)
    p.data.materials.append(graphite)
    blank_parts.append(p)
blank = join(blank_parts, "BlankMesh")

# Guides
guides = []
guide_ts = (0.12, 0.24, 0.38, 0.52, 0.66, 0.80, 0.92)
for i, t in enumerate(guide_ts):
    y = 0.42 + t * blank_len
    r = 0.011 * (1.0 - 0.55 * t)
    g = add_torus(f"Guide{i}", r, 0.0011, (0, y, r * 0.15), rot=(math.pi / 2, 0, 0), major_seg=14, minor_seg=6)
    g.data.materials.append(chrome)
    guides.append(g)
tip_ring = add_torus("TipRing", 0.0042, 0.0009, (0, 0.42 + blank_len, 0.0), rot=(math.pi / 2, 0, 0), major_seg=12, minor_seg=6)
tip_ring.data.materials.append(chrome)
guides.append(tip_ring)

# Spinning reel
reel_y, reel_z = 0.305, -0.028
body = add_cyl("ReelBody", 0.022, 0.038, (0, reel_y, reel_z), rot=(math.pi / 2, 0, 0), verts=28)
body.data.materials.append(reel_body)
foot = add_cyl("ReelFoot", 0.006, 0.03, (0, reel_y, reel_z + 0.018), verts=12)
foot.data.materials.append(chrome)
spool = add_cyl("Spool", 0.016, 0.022, (0, reel_y, reel_z - 0.012), rot=(math.pi / 2, 0, 0), verts=24)
spool.data.materials.append(line_spool)
rotor = add_cyl("ReelRotorMesh", 0.018, 0.01, (0, reel_y, reel_z - 0.004), rot=(math.pi / 2, 0, 0), verts=20)
rotor.data.materials.append(reel_body)
# bail
bail = add_torus("Bail", 0.021, 0.0012, (0, reel_y, reel_z - 0.004), rot=(0, 0, 0), major_seg=20, minor_seg=6)
bail.data.materials.append(chrome)
# crank arm
arm = add_cyl("CrankArm", 0.0032, 0.046, (0.023, reel_y, reel_z - 0.002), rot=(0, 0, math.pi / 2), verts=12)
arm.data.materials.append(chrome)
knob = add_uvsphere("CrankKnob", 0.0075, (0.046, reel_y, reel_z - 0.002), 14)
knob.data.materials.append(seat)
reel_join = join([body, foot, spool, rotor, bail], "ReelHousing")
handle_crank = join([arm, knob], "ReelHandleMesh")

# Armature along blank
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
arm_obj = bpy.context.active_object
arm_obj.name = "RodArmature"
eb = arm_obj.data.edit_bones
root = eb[0]
root.name = "RodGripBone"
root.head = Vector((0, 0.12, 0))
root.tail = Vector((0, 0.42, 0))
prev = root
blank_bones = []
for i in range(n_bones):
    t0 = i / n_bones
    t1 = (i + 1) / n_bones
    b = eb.new(f"Blank_{i}")
    b.head = Vector((0, 0.42 + t0 * blank_len, 0))
    b.tail = Vector((0, 0.42 + t1 * blank_len, 0))
    b.parent = prev
    b.use_connect = True
    blank_bones.append(b)
    prev = b
bpy.ops.object.mode_set(mode="OBJECT")

# Skin blank to bones
blank.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

# Parent rigid parts to armature (bone-relative)
def parent_bone(obj, bone_name, keep=True):
    obj.parent = arm_obj
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name


parent_bone(handle_grp, "RodGripBone")
parent_bone(reel_join, "RodGripBone")
parent_bone(handle_crank, "RodGripBone")
for g in guides:
    # parent to nearest blank bone
    y = g.location.y
    idx = min(n_bones - 1, max(0, int((y - 0.42) / blank_len * n_bones)))
    parent_bone(g, f"Blank_{idx}")

# Named contract empties (keep world positions, parent to bones)
rg = empty("RodGrip", (0, 0.14, 0), arm_obj)
rg.parent_type = "BONE"
rg.parent_bone = "RodGripBone"
rt = empty("RodTip", (0, 0.42 + blank_len, 0), arm_obj)
rt.parent_type = "BONE"
rt.parent_bone = f"Blank_{n_bones-1}"
ls = empty("LineStart", (0, 0.42 + blank_len, 0.004), arm_obj)
ls.parent_type = "BONE"
ls.parent_bone = f"Blank_{n_bones-1}"
reel = empty("Reel", (0, reel_y, reel_z), arm_obj)
reel.parent_type = "BONE"
reel.parent_bone = "RodGripBone"
rh = empty("ReelHandle", (0.046, reel_y, reel_z - 0.002), arm_obj)
rh.parent_type = "BONE"
rh.parent_bone = "RodGripBone"
# crank mesh follows ReelHandle
handle_crank.parent = rh
handle_crank.parent_type = "OBJECT"
handle_crank.location = (0, 0, 0)
rst = empty("RodSupportTarget", (0, 0.42 + blank_len * 0.58, 0), arm_obj)
rst.parent_type = "BONE"
rst.parent_bone = "Blank_5"
rht = empty("ReelHandleTarget", (0.046, reel_y, reel_z - 0.002), rh)

# Also name a rotor empty for spinReel()
rr = empty("ReelRotor", (0, reel_y, reel_z - 0.004), reel)

# Stats
tris = 0
for o in bpy.data.objects:
    if o.type == "MESH":
        tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
print("ROD_TRIS", tris)

Path(OUT).parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    export_skins=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    export_yup=True,
    export_apply=False,
    export_extras=True,
)
print("WROTE", OUT)
