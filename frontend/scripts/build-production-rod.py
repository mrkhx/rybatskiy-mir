#!/usr/bin/env python3
"""Production spinning rod: ONE continuous tapered blank, handle along the same axis.

Canonical axis (after glTF Y-up export):
  +Y = butt → tip (RodGrip → RodTip)
  +Z = 'up' of the reel (reel hangs toward -Z in Blender / -Y after some converters)
  Blender build axis: +Y. export_yup maps Blender +Z→glTF +Y and Blender +Y→glTF +Z,
  so we BUILD along Blender +Z to keep glTF +Y = rod axis.

Build (Blender Z-up):
  +Z = butt → tip
After export (glTF Y-up):
  +Y = butt → tip
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector

OUT = "/workspace/public/models/production/rod.glb"
N_BONES = 8
# Metres. 2.45 m spinning rod.
BUTT_Z = 0.0
REAR_GRIP = (0.02, 0.24)      # z0, z1
SEAT = (0.24, 0.34)
FORE = (0.34, 0.44)
BLANK_Z0 = 0.44
BLANK_LEN = 2.01
TIP_Z = BLANK_Z0 + BLANK_LEN  # 2.45
BLANK_R0 = 0.0074
BLANK_R1 = 0.0015


def mat(name, color, rough=0.45, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return m


def apply_rot(o):
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.select_set(False)


def cyl_z(name, radius, z0, z1, verts=28):
    depth = z1 - z0
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts, radius=radius, depth=depth, location=(0, 0, z0 + depth * 0.5)
    )
    o = bpy.context.active_object
    o.name = name
    apply_rot(o)
    return o


def sphere(name, r, loc, seg=16):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg)
    o = bpy.context.active_object
    o.name = name
    return o


def empty(name, loc):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=loc)
    o = bpy.context.active_object
    o.name = name
    o.empty_display_size = 0.025
    return o


def parent_bone_keep(obj, arm, bone_name):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    arm.data.bones.active = arm.data.bones[bone_name]
    bpy.ops.object.parent_set(type="BONE", keep_transform=True)


def make_tapered_blank():
    """Single connected tube, rings along +Z, no gaps."""
    import bmesh

    rings, segs = 32, 16
    bm = bmesh.new()
    verts = []
    for i in range(rings + 1):
        t = i / rings
        z = BLANK_Z0 + t * BLANK_LEN
        # slight ease so the butt of the blank matches the foregrip
        r = BLANK_R0 * (1.0 - t) ** 0.85 + BLANK_R1 * t
        ring = []
        for j in range(segs):
            a = 2 * math.pi * j / segs
            v = bm.verts.new((r * math.cos(a), r * math.sin(a), z))
            ring.append(v)
        verts.append(ring)
    bm.verts.ensure_lookup_table()
    for i in range(rings):
        for j in range(segs):
            a = verts[i][j]
            b = verts[i][(j + 1) % segs]
            c = verts[i + 1][(j + 1) % segs]
            d = verts[i + 1][j]
            bm.faces.new((a, b, c, d))
    mesh = bpy.data.meshes.new("BlankMesh")
    bm.to_mesh(mesh)
    bm.free()
    mesh.calc_loop_triangles()
    ob = bpy.data.objects.new("BlankMesh", mesh)
    bpy.context.collection.objects.link(ob)
    return ob


bpy.ops.wm.read_factory_settings(use_empty=True)

cork = mat("cork", (0.62, 0.48, 0.32), rough=0.84)
graphite = mat("graphite", (0.10, 0.11, 0.12), rough=0.36, metal=0.18)
seat_mat = mat("seat", (0.07, 0.07, 0.08), rough=0.38, metal=0.3)
chrome = mat("chrome", (0.78, 0.80, 0.82), rough=0.18, metal=0.9)
reel_body = mat("reel_body", (0.16, 0.17, 0.19), rough=0.32, metal=0.5)
spool_mat = mat("spool", (0.55, 0.22, 0.14), rough=0.52, metal=0.04)
tape = mat("tape", (0.12, 0.13, 0.12), rough=0.72)

# --- handle along +Z, same axis as blank ---
butt = sphere("ButtCap", 0.015, (0, 0, 0.012), 18)
butt.data.materials.append(chrome)
rear = cyl_z("RearGrip", 0.014, *REAR_GRIP, 28)
rear.data.materials.append(cork)
reel_seat = cyl_z("ReelSeat", 0.0116, *SEAT, 24)
reel_seat.data.materials.append(seat_mat)
fore = cyl_z("Foregrip", 0.011, *FORE, 24)
fore.data.materials.append(cork)
# decorative winding wrap between seat and blank
wrap = cyl_z("Wrap", 0.0088, FORE[1] - 0.012, BLANK_Z0 + 0.012, 16)
wrap.data.materials.append(tape)

bpy.ops.object.select_all(action="DESELECT")
for o in (butt, rear, reel_seat, fore, wrap):
    o.select_set(True)
bpy.context.view_layer.objects.active = rear
bpy.ops.object.join()
handle = bpy.context.active_object
handle.name = "HandleMesh"

blank = make_tapered_blank()
blank.data.materials.append(graphite)

# --- guides: tiny foot + ring, hole along +Z ---
guides = []
guide_ts = (0.10, 0.22, 0.36, 0.50, 0.64, 0.78, 0.90)
for i, t in enumerate(guide_ts):
    z = BLANK_Z0 + t * BLANK_LEN
    rb = BLANK_R0 * (1.0 - t) ** 0.85 + BLANK_R1 * t
    ring_r = 0.0072 * (1.0 - 0.55 * t) + 0.0024
    foot_h = 0.007 + ring_r * 0.35
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8, radius=0.0009, depth=foot_h, location=(0, rb + foot_h * 0.5, z)
    )
    foot = bpy.context.active_object
    foot.rotation_euler = (math.pi / 2, 0, 0)
    apply_rot(foot)
    foot.data.materials.append(chrome)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=ring_r,
        minor_radius=0.00085,
        major_segments=14,
        minor_segments=6,
        location=(0, rb + foot_h + ring_r * 0.15, z),
    )
    ring = bpy.context.active_object
    # hole along +Z (rod axis)
    ring.rotation_euler = (0, 0, 0)
    apply_rot(ring)
    ring.data.materials.append(chrome)
    bpy.ops.object.select_all(action="DESELECT")
    foot.select_set(True)
    ring.select_set(True)
    bpy.context.view_layer.objects.active = ring
    bpy.ops.object.join()
    g = bpy.context.active_object
    g.name = f"Guide{i}"
    guides.append(g)

bpy.ops.mesh.primitive_torus_add(
    major_radius=0.0034, minor_radius=0.0007, major_segments=12, minor_segments=6, location=(0, 0, TIP_Z)
)
tip_ring = bpy.context.active_object
tip_ring.name = "TipRing"
tip_ring.data.materials.append(chrome)

# --- compact spinning reel hanging toward -Y (under the seat) ---
reel_z = (SEAT[0] + SEAT[1]) * 0.5
reel_y = -0.034
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.018, depth=0.032, location=(0, reel_y, reel_z))
body = bpy.context.active_object
body.rotation_euler = (math.pi / 2, 0, 0)
apply_rot(body)
body.data.materials.append(reel_body)
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.0045, depth=0.022, location=(0, reel_y * 0.45, reel_z))
foot_r = bpy.context.active_object
foot_r.rotation_euler = (math.pi / 2, 0, 0)
apply_rot(foot_r)
foot_r.data.materials.append(chrome)
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.0135, depth=0.016, location=(0, reel_y - 0.012, reel_z))
spool = bpy.context.active_object
spool.rotation_euler = (math.pi / 2, 0, 0)
apply_rot(spool)
spool.data.materials.append(spool_mat)
bpy.ops.mesh.primitive_torus_add(
    major_radius=0.017, minor_radius=0.0011, major_segments=18, minor_segments=6, location=(0, reel_y - 0.004, reel_z)
)
bail = bpy.context.active_object
bail.rotation_euler = (math.pi / 2, 0, 0)
apply_rot(bail)
bail.data.materials.append(chrome)
bpy.ops.object.select_all(action="DESELECT")
for o in (body, foot_r, spool, bail):
    o.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
housing = bpy.context.active_object
housing.name = "ReelHousing"

# crank
bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.0026, depth=0.038, location=(0.019, reel_y - 0.002, reel_z))
arm = bpy.context.active_object
arm.rotation_euler = (0, 0, math.pi / 2)
apply_rot(arm)
arm.data.materials.append(chrome)
knob = sphere("CrankKnob", 0.0064, (0.038, reel_y - 0.002, reel_z), 12)
knob.data.materials.append(seat_mat)
bpy.ops.object.select_all(action="DESELECT")
arm.select_set(True)
knob.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.join()
crank = bpy.context.active_object
crank.name = "ReelHandleMesh"

# --- armature along +Z ---
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
arm_obj = bpy.context.active_object
arm_obj.name = "RodArmature"
eb = arm_obj.data.edit_bones
root = eb[0]
root.name = "RodGripBone"
root.head = Vector((0, 0, 0.08))
root.tail = Vector((0, 0, BLANK_Z0))
prev = root
for i in range(N_BONES):
    t0 = i / N_BONES
    t1 = (i + 1) / N_BONES
    b = eb.new(f"Blank_{i}")
    b.head = Vector((0, 0, BLANK_Z0 + t0 * BLANK_LEN))
    b.tail = Vector((0, 0, BLANK_Z0 + t1 * BLANK_LEN))
    b.parent = prev
    b.use_connect = True
    prev = b
bpy.ops.object.mode_set(mode="OBJECT")

# Skin the ONE blank mesh
bpy.ops.object.select_all(action="DESELECT")
blank.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

# Rigid parts stay on the grip / nearest blank bone, KEEP world transform
parent_bone_keep(handle, arm_obj, "RodGripBone")
parent_bone_keep(housing, arm_obj, "RodGripBone")
parent_bone_keep(crank, arm_obj, "RodGripBone")
parent_bone_keep(tip_ring, arm_obj, f"Blank_{N_BONES - 1}")
for i, g in enumerate(guides):
    idx = min(N_BONES - 1, max(0, int(guide_ts[i] * N_BONES)))
    parent_bone_keep(g, arm_obj, f"Blank_{idx}")

# Contract anchors
def bone_empty(name, loc, bone):
    o = empty(name, loc)
    parent_bone_keep(o, arm_obj, bone)
    return o


bone_empty("RodGrip", (0, 0, 0.13), "RodGripBone")
bone_empty("RodTip", (0, 0, TIP_Z), f"Blank_{N_BONES - 1}")
bone_empty("LineStart", (0, 0.004, TIP_Z), f"Blank_{N_BONES - 1}")
bone_empty("Reel", (0, reel_y, reel_z), "RodGripBone")
rh = bone_empty("ReelHandle", (0.038, reel_y - 0.002, reel_z), "RodGripBone")
bone_empty("RodSupportTarget", (0, 0, 0.50), "Blank_0")
bone_empty("ReelHandleTarget", (0.038, reel_y - 0.002, reel_z), "RodGripBone")
bone_empty("ReelRotor", (0, reel_y - 0.004, reel_z), "RodGripBone")

# Parent crank mesh to ReelHandle empty so spinReel can rotate it
# (keep_transform already parented to bone; leave it)

tris = 0
for o in bpy.data.objects:
    if o.type == "MESH":
        tris += sum(max(0, len(p.vertices) - 2) for p in o.data.polygons)
print("ROD_TRIS", tris, "length", TIP_Z, "bones", N_BONES)

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
)
print("WROTE", OUT)
print("AXIS glTF +Y = butt → tip (built along Blender +Z, Y-up export)")
