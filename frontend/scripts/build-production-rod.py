#!/usr/bin/env python3
"""Production spinning rod — real layout, not stacked cylinders.

Blender build: +Z = butt → tip, −Y = down (reel + guides hang under the blank).
glTF Y-up export: +Y = butt → tip.

Spinning reel: foot clamped in the reel seat, body UNDER the rod, spool axis
along the blank, open face toward the tip. Guide train + tip-top share that
underside plane. Stripper is largest; rings shrink toward a sleeved tip-top.
"""
from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector

OUT = "/workspace/public/models/production/rod.glb"
N_BONES = 8

REAR = (0.02, 0.22)
SEAT = (0.22, 0.34)
FORE = (0.34, 0.44)
BLANK_Z0 = 0.44
BLANK_LEN = 2.01
TIP_Z = BLANK_Z0 + BLANK_LEN  # 2.45
R0, RMID, R1 = 0.0068, 0.0034, 0.00085


def blank_r(t: float) -> float:
    t = max(0.0, min(1.0, t))
    if t < 0.75:
        u = t / 0.75
        return R0 * (1 - u) + RMID * u
    u = (t - 0.75) / 0.25
    ease = u * u
    return RMID * (1 - ease) + R1 * ease


def mat(name, color, rough=0.45, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return m


def apply_rs(o):
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.select_set(False)


def cyl(name, radius, depth, loc, rot=(0, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = rot
    apply_rs(o)
    return o


def sphere(name, r, loc, seg=14):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg)
    o = bpy.context.active_object
    o.name = name
    return o


def torus(name, major, minor, loc, rot=(0, 0, 0), maj=14, mn=6):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major, minor_radius=minor, major_segments=maj, minor_segments=mn, location=loc
    )
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = rot
    apply_rs(o)
    return o


def cube(name, s, loc):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = s
    apply_rs(o)
    return o


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def lathe(name, profile, segs=28):
    """Revolve (radius, z) profile around +Z."""
    import bmesh

    bm = bmesh.new()
    rings = []
    for r, z in profile:
        r = max(float(r), 1e-5)
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    bm.verts.ensure_lookup_table()
    for i in range(len(rings) - 1):
        for j in range(segs):
            bm.faces.new(
                (
                    rings[i][j],
                    rings[i][(j + 1) % segs],
                    rings[i + 1][(j + 1) % segs],
                    rings[i + 1][j],
                )
            )
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    return ob


def bevel(o, width=0.005, segments=3):
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    m = o.modifiers.new("bev", "BEVEL")
    m.width = width
    m.segments = segments
    m.limit_method = "NONE"
    bpy.ops.object.modifier_apply(modifier="bev")
    o.select_set(False)
    return o
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=loc)
    o = bpy.context.active_object
    o.name = name
    o.empty_display_size = 0.02
    return o


def empty(name, loc):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=loc)
    o = bpy.context.active_object
    o.name = name
    o.empty_display_size = 0.02
    return o


def parent_bone_keep(obj, arm, bone_name):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    arm.data.bones.active = arm.data.bones[bone_name]
    bpy.ops.object.parent_set(type="BONE", keep_transform=True)


def make_blank():
    import bmesh

    rings, segs = 40, 14
    bm = bmesh.new()
    rings_v = []
    for i in range(rings + 1):
        t = i / rings
        z = BLANK_Z0 + t * BLANK_LEN
        r = blank_r(t)
        ring = []
        for j in range(segs):
            a = 2 * math.pi * j / segs
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings_v.append(ring)
    bm.verts.ensure_lookup_table()
    for i in range(rings):
        for j in range(segs):
            bm.faces.new(
                (
                    rings_v[i][j],
                    rings_v[i][(j + 1) % segs],
                    rings_v[i + 1][(j + 1) % segs],
                    rings_v[i + 1][j],
                )
            )
    mesh = bpy.data.meshes.new("BlankMesh")
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new("BlankMesh", mesh)
    bpy.context.collection.objects.link(ob)
    return ob


bpy.ops.wm.read_factory_settings(use_empty=True)

cork = mat("cork", (0.62, 0.48, 0.32), 0.84)
graphite = mat("graphite", (0.11, 0.12, 0.13), 0.34, 0.2)
seat_m = mat("seat", (0.08, 0.08, 0.09), 0.36, 0.35)
chrome = mat("chrome", (0.72, 0.74, 0.76), 0.18, 0.88)
reel_m = mat("reel_body", (0.07, 0.075, 0.08), 0.32, 0.45)
rotor_m = mat("rotor", (0.10, 0.11, 0.12), 0.28, 0.5)
spool_m = mat("spool", (0.42, 0.44, 0.46), 0.28, 0.62)
knob_m = mat("knob", (0.09, 0.09, 0.10), 0.55, 0.08)
tape = mat("tape", (0.12, 0.13, 0.12), 0.72)

# ----- handle along +Z -----
butt = sphere("ButtCap", 0.0145, (0, 0, 0.012), 16)
butt.data.materials.append(chrome)
rear = cyl("RearGrip", 0.0135, REAR[1] - REAR[0], (0, 0, (REAR[0] + REAR[1]) * 0.5), verts=28)
rear.data.materials.append(cork)
seat = cyl("ReelSeat", 0.0112, SEAT[1] - SEAT[0], (0, 0, (SEAT[0] + SEAT[1]) * 0.5), verts=24)
seat.data.materials.append(seat_m)
# hood / clamp on the underside of the seat so the foot reads as locked in
hood = cube("SeatHood", (0.016, 0.007, 0.07), (0, -0.012, (SEAT[0] + SEAT[1]) * 0.5))
hood.data.materials.append(seat_m)
fore = cyl("Foregrip", 0.0106, FORE[1] - FORE[0], (0, 0, (FORE[0] + FORE[1]) * 0.5), verts=24)
fore.data.materials.append(cork)
wrap = cyl("Wrap", 0.0084, 0.024, (0, 0, FORE[1] + 0.004), verts=16)
wrap.data.materials.append(tape)
handle = join([butt, rear, seat, hood, fore, wrap], "HandleMesh")

blank = make_blank()
blank.data.materials.append(graphite)

# ----- spinning reel UNDER the seat (2500-class, handle on −X / left) -----
# Blender: +Z tip, −Y down, −X left (crank with the left hand).
seat_z = (SEAT[0] + SEAT[1]) * 0.5
cy, cz = -0.054, seat_z - 0.004

# 1. foot — thin plate in the seat hood, flared ends
foot = cube("ReelFoot", (0.009, 0.0028, 0.064), (0, -0.0135, seat_z))
foot.data.materials.append(chrome)
bevel(foot, 0.0012, 2)
# 2. stem
stem = cyl("ReelStem", 0.0036, 0.018, (0, -0.024, seat_z), rot=(math.pi / 2, 0, 0), verts=14)
stem.data.materials.append(chrome)
stem2 = cyl("ReelStemFlare", 0.005, 0.006, (0, -0.034, seat_z), rot=(math.pi / 2, 0, 0), verts=14)
stem2.data.materials.append(reel_m)

# 3. body — rounded housing, longer back-to-front than a sphere
body = cube("ReelBody", (0.028, 0.036, 0.040), (0, cy, cz))
body.data.materials.append(reel_m)
bevel(body, 0.0075, 4)
# rear gear bulge
bulge = cube("GearHouse", (0.024, 0.030, 0.016), (0, cy + 0.002, cz - 0.016))
bulge.data.materials.append(reel_m)
bevel(bulge, 0.005, 3)
# right side plate (no handle)
plate = cyl("SidePlate", 0.011, 0.004, (0.015, cy, cz), rot=(0, math.pi / 2, 0), verts=20)
plate.data.materials.append(rotor_m)

# 4. rotor cup in front of the body
rotor_z = cz + 0.016
rotor_cup = cyl("RotorCup", 0.0175, 0.010, (0, cy, rotor_z), verts=28)
rotor_cup.data.materials.append(rotor_m)
rotor_back = cyl("RotorBack", 0.018, 0.003, (0, cy, rotor_z - 0.006), verts=28)
rotor_back.data.materials.append(rotor_m)
rotor_lip = torus("RotorLip", 0.0178, 0.00085, (0, cy, rotor_z + 0.005), maj=28, mn=6)
rotor_lip.data.materials.append(chrome)
# rotor arms to the bail (left/right)
arm_l = cyl("RotorArmL", 0.0022, 0.018, (-0.016, cy, rotor_z + 0.006), verts=10)
arm_l.data.materials.append(rotor_m)
arm_r = cyl("RotorArmR", 0.0022, 0.018, (0.016, cy, rotor_z + 0.006), verts=10)
arm_r.data.materials.append(rotor_m)

# 5. spool — lathed profile, open face toward +Z (tip)
spool = lathe(
    "Spool",
    [
        (0.0148, 0.000),
        (0.0150, 0.0025),
        (0.0112, 0.0045),
        (0.0104, 0.012),
        (0.0108, 0.017),
        (0.0152, 0.0195),
        (0.0152, 0.0215),
        (0.0060, 0.0215),
        (0.0055, 0.024),
    ],
    segs=32,
)
spool.location = (0, cy, rotor_z + 0.002)
spool.data.materials.append(spool_m)

# 6. drag knob on the front of the spool
drag = lathe(
    "DragKnob",
    [
        (0.0060, 0.000),
        (0.0074, 0.0015),
        (0.0074, 0.0045),
        (0.0048, 0.0055),
        (0.0022, 0.0060),
        (0.0001, 0.0060),
    ],
    segs=20,
)
drag.location = (0, cy, rotor_z + 0.026)
drag.data.materials.append(knob_m)

# 7. bail arm — wire around the FRONT of the spool (hole along Z)
bail_z = rotor_z + 0.022
bail = torus("BailArm", 0.0188, 0.00115, (0, cy, bail_z), maj=28, mn=8)
bail.data.materials.append(chrome)
# 8. line roller at the TOP of the bail (toward the blank)
roller = cyl("LineRoller", 0.0028, 0.0055, (0, cy + 0.0185, bail_z), rot=(0, math.pi / 2, 0), verts=14)
roller.data.materials.append(chrome)
roller_pin = cyl("RollerPin", 0.0011, 0.008, (0, cy + 0.0185, bail_z), rot=(0, math.pi / 2, 0), verts=8)
roller_pin.data.materials.append(reel_m)

housing = join(
    [
        foot,
        stem,
        stem2,
        body,
        bulge,
        plate,
        rotor_cup,
        rotor_back,
        rotor_lip,
        arm_l,
        arm_r,
        spool,
        drag,
        bail,
        roller,
        roller_pin,
    ],
    "ReelHousing",
)

# 9. handle on the LEFT (−X): arm + oval knob
h_y, h_z = cy, cz
h_arm = cyl("CrankArm", 0.0022, 0.036, (-0.034, h_y, h_z), rot=(0, 0, math.pi / 2), verts=12)
h_arm.data.materials.append(chrome)
h_hub = cyl("CrankHub", 0.0042, 0.006, (-0.017, h_y, h_z), rot=(0, 0, math.pi / 2), verts=14)
h_hub.data.materials.append(rotor_m)
h_knob = sphere("CrankKnob", 0.0068, (-0.053, h_y, h_z), 16)
h_knob.scale = (0.72, 1.45, 0.78)
apply_rs(h_knob)
h_knob.data.materials.append(knob_m)
crank = join([h_arm, h_hub, h_knob], "ReelHandleMesh")

# ----- guide train on the UNDERSIDE (−Y), same plane as the reel -----
# (t along blank, inner radius of ring)
GUIDES = [
    (0.11, 0.0115),  # stripper — largest, nearest the reel
    (0.23, 0.0088),
    (0.36, 0.0068),
    (0.50, 0.0054),
    (0.63, 0.0044),
    (0.75, 0.0036),
    (0.85, 0.0029),
    (0.93, 0.0024),
]
guides = []
for i, (t, ring_r) in enumerate(GUIDES):
    z = BLANK_Z0 + t * BLANK_LEN
    rb = blank_r(t)
    foot_h = 0.005 + ring_r * 0.45
    # foot from blank surface downward (−Y)
    gfoot = cyl(
        f"GFoot{i}",
        0.0008,
        foot_h,
        (0, -(rb + foot_h * 0.5), z),
        rot=(math.pi / 2, 0, 0),
        verts=8,
    )
    gfoot.data.materials.append(chrome)
    # ring hole along +Z (rod axis), centre below the blank
    gring = torus(
        f"Guide{i}",
        ring_r,
        0.00075,
        (0, -(rb + foot_h + ring_r * 0.15), z),
        maj=14,
        mn=6,
    )
    gring.data.materials.append(chrome)
    guides.append(join([gfoot, gring], f"Guide{i}"))

# tip-top: sleeve ON the blank end + tiny ring, no gap
sleeve = cyl("TipSleeve", R1 + 0.00055, 0.009, (0, 0, TIP_Z - 0.0035), verts=12)
sleeve.data.materials.append(chrome)
tt_foot = cyl(
    "TipFoot",
    0.0006,
    0.0045,
    (0, -(R1 + 0.003), TIP_Z - 0.001),
    rot=(math.pi / 2, 0, 0),
    verts=8,
)
tt_foot.data.materials.append(chrome)
tt_ring = torus("TipRing", 0.00215, 0.00055, (0, -(R1 + 0.0062), TIP_Z - 0.001), maj=12, mn=6)
tt_ring.data.materials.append(chrome)
tiptop = join([sleeve, tt_foot, tt_ring], "TipTop")

# ----- armature along +Z -----
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
    t0, t1 = i / N_BONES, (i + 1) / N_BONES
    b = eb.new(f"Blank_{i}")
    b.head = Vector((0, 0, BLANK_Z0 + t0 * BLANK_LEN))
    b.tail = Vector((0, 0, BLANK_Z0 + t1 * BLANK_LEN))
    b.parent = prev
    b.use_connect = True
    prev = b
bpy.ops.object.mode_set(mode="OBJECT")

bpy.ops.object.select_all(action="DESELECT")
blank.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

parent_bone_keep(handle, arm_obj, "RodGripBone")
parent_bone_keep(housing, arm_obj, "RodGripBone")
parent_bone_keep(crank, arm_obj, "RodGripBone")
parent_bone_keep(tiptop, arm_obj, f"Blank_{N_BONES - 1}")
for i, g in enumerate(guides):
    idx = min(N_BONES - 1, max(0, int(GUIDES[i][0] * N_BONES)))
    parent_bone_keep(g, arm_obj, f"Blank_{idx}")


def bone_empty(name, loc, bone):
    o = empty(name, loc)
    parent_bone_keep(o, arm_obj, bone)
    return o


bone_empty("RodGrip", (0, 0, 0.12), "RodGripBone")
bone_empty("RodTip", (0, 0, TIP_Z), f"Blank_{N_BONES - 1}")
bone_empty("LineStart", (0, -(R1 + 0.006), TIP_Z), f"Blank_{N_BONES - 1}")
bone_empty("Reel", (0, -0.048, seat_z), "RodGripBone")
bone_empty("ReelHandle", (-0.053, cy, cz), "RodGripBone")
bone_empty("RodSupportTarget", (0, 0, 0.48), "Blank_0")
bone_empty("ReelHandleTarget", (-0.053, cy, cz), "RodGripBone")
bone_empty("ReelRotor", (0, cy, rotor_z), "RodGripBone")

tris = sum(
    max(0, len(p.vertices) - 2) for o in bpy.data.objects if o.type == "MESH" for p in o.data.polygons
)
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
print("AXIS glTF +Y = butt → tip; −Z (export) ≈ down = reel + guides")
