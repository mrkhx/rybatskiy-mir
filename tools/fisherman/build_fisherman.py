#!/usr/bin/env python3
"""
Authored fisherman for Рыбацкий Мир.

Body: Blender Studio Human Base Meshes v1.4.1 (CC0) male realistic.
Clothes / hair / cap / boots / sockets / Mixamo-style Humanoid rig: original.

Run:
  blender --background --python tools/fisherman/build_fisherman.py
"""
from __future__ import annotations

import math
import os
import sys
from mathutils import Vector, Euler

import bpy
import bmesh

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "clients/unity/RybatskiyMir3D/Assets/_Project/Characters/Fisherman")
TEX = os.path.join(OUT, "Textures")
MOD = os.path.join(OUT, "Models")
DOC = os.path.join(OUT, "Docs")
SRC = os.path.join(ROOT, "tools/fisherman/source")
RES = os.path.join(OUT, "Resources")
BASE = os.path.join(SRC, "base_male_realistic.blend")
TARGET_H = 1.78
PI2 = math.pi * 2.0

for d in (OUT, TEX, MOD, DOC, SRC, RES,
          os.path.join(OUT, "Materials"),
          os.path.join(OUT, "Prefabs"),
          os.path.join(OUT, "Animations")):
    os.makedirs(d, exist_ok=True)


def log(msg):
    print(msg, flush=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 1.0
    sc.render.fps = 30


def select_only(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        if o is None:
            continue
        o.select_set(True)
        bpy.context.view_layer.objects.active = o


def apply_all(obj):
    select_only([obj])
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def shade_smooth(obj):
    select_only([obj])
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(60.0))
    except Exception:
        bpy.ops.object.shade_smooth()
    obj.select_set(False)


def _clear_custom_normals(me):
    try:
        if getattr(me, "has_custom_normals", False):
            me.free_normals_split()
    except Exception:
        pass


def finalize_mesh(obj, merge=0.0004):
    """Production mesh hygiene. Unity must import these normals as-is.

    Apply transforms, drop degenerates, triangulate, recalc outside,
    mesh.validate(), write custom split normals so FBX LayerElementNormal
    is populated. Do not rely on Unity recalculating.
    """
    if obj is None or obj.type != "MESH":
        return {"name": "?", "validate": False, "zero_n": 0, "nontri": 0,
                "verts": 0, "tris": 0}

    sx, sy, sz = obj.scale
    if min(sx, sy, sz) < 0:
        log(f"  negative scale on {obj.name}: {(sx, sy, sz)} — abs + apply")
        obj.scale = (abs(sx), abs(sy), abs(sz))
    apply_all(obj)

    me = obj.data
    _clear_custom_normals(me)

    bm = bmesh.new()
    bm.from_mesh(me)
    if bm.verts:
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=merge)
    try:
        bmesh.ops.dissolve_degenerate(bm, dist=1e-5, edges=list(bm.edges))
    except TypeError:
        try:
            bmesh.ops.dissolve_degenerate(bm, dist=1e-5)
        except Exception:
            pass
    bm.faces.ensure_lookup_table()
    dead = [f for f in bm.faces if f.calc_area() < 1e-12]
    if dead:
        bmesh.ops.delete(bm, geom=dead, context="FACES")
    loose_e = [e for e in bm.edges if e.is_wire]
    if loose_e:
        bmesh.ops.delete(bm, geom=loose_e, context="EDGES")
    loose_v = [v for v in bm.verts if not v.link_faces]
    if loose_v:
        bmesh.ops.delete(bm, geom=loose_v, context="VERTS")
    if bm.faces:
        bmesh.ops.triangulate(
            bm, faces=list(bm.faces), quad_method="BEAUTY", ngon_method="BEAUTY")
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()

    validate_changed = bool(me.validate(verbose=True, clean_customdata=True))
    me.validate(verbose=False, clean_customdata=True)

    for p in me.polygons:
        p.use_smooth = True
    me.update()

    select_only([obj])
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.dissolve_degenerate(threshold=0.0001)
    bpy.ops.mesh.quads_convert_to_tris(quad_method="BEAUTY", ngon_method="BEAUTY")
    bpy.ops.object.mode_set(mode="OBJECT")
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(60.0))
    except Exception:
        bpy.ops.object.shade_smooth()

    me = obj.data
    me.update()
    me.calc_loop_triangles()

    poly_of_loop = [None] * len(me.loops)
    for p in me.polygons:
        for i in range(p.loop_start, p.loop_start + p.loop_total):
            poly_of_loop[i] = p

    loop_nors = []
    zero = 0
    for i, loop in enumerate(me.loops):
        n = me.vertices[loop.vertex_index].normal.copy()
        if n.length_squared < 1e-16 or any(math.isnan(c) for c in n):
            poly = poly_of_loop[i]
            n = Vector(poly.normal) if poly is not None else Vector((0.0, 0.0, 1.0))
            if n.length_squared < 1e-16 or any(math.isnan(c) for c in n):
                n = Vector((0.0, 0.0, 1.0))
            zero += 1
        n.normalize()
        loop_nors.append(n)
    if loop_nors:
        try:
            _clear_custom_normals(me)
            me.normals_split_custom_set(loop_nors)
        except Exception as e:
            log(f"  custom split normals failed on {obj.name}: {e}")
    me.update()
    me.calc_loop_triangles()

    nontri = sum(1 for p in me.polygons if p.loop_total != 3)
    tris = len(me.loop_triangles)
    log(f"  finalize {obj.name}: verts={len(me.vertices)} tris={tris} "
        f"nontri={nontri} zeroN={zero} validate_changed={validate_changed}")
    if nontri:
        log(f"  ERROR {obj.name} still has {nontri} non-triangle faces")
    return {
        "name": obj.name,
        "validate": validate_changed,
        "zero_n": zero,
        "nontri": nontri,
        "verts": len(me.vertices),
        "tris": tris,
    }


def clean_mesh(obj):
    """Kept as an alias so older call sites still run full hygiene."""
    return finalize_mesh(obj)


def smart_uv(obj):
    select_only([obj])
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.03)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)


def dup_mesh(obj, name):
    d = obj.copy()
    d.data = obj.data.copy()
    d.name = name
    d.parent = None
    bpy.context.collection.objects.link(d)
    return d


def delete_verts(obj, keep_fn):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    kill = [v for v in bm.verts if not keep_fn(v.co)]
    if kill:
        bmesh.ops.delete(bm, geom=kill, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def inflate(obj, amount):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * amount
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def wrinkle(obj, amp=0.005, fz=16.0, fx=8.0):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.normal_update()
    for v in bm.verts:
        p = v.co
        w = math.sin(p.z * fz + p.x * fx) * math.sin(p.y * 13.0 + p.z * 6.0)
        v.co += v.normal * amp * w
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def solidify(obj, thickness=0.008, offset=1.0):
    mod = obj.modifiers.new("Sol", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = offset
    mod.use_quality_normals = True
    select_only([obj])
    bpy.ops.object.modifier_apply(modifier="Sol")


def join_objects(name, objs):
    objs = [o for o in objs if o is not None]
    if not objs:
        return None
    select_only(objs)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def bm_to_obj(name, bm):
    bm.normal_update()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.update()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    return obj


def add_face_ring(bm, a, b):
    n = len(a)
    for i in range(n):
        j = (i + 1) % n
        try:
            bm.faces.new((a[i], a[j], b[j], b[i]))
        except ValueError:
            pass


def cap_ring(bm, ring, center, flip=False):
    c = bm.verts.new(center)
    n = len(ring)
    for i in range(n):
        j = (i + 1) % n
        vs = (c, ring[j], ring[i]) if flip else (c, ring[i], ring[j])
        try:
            bm.faces.new(vs)
        except ValueError:
            pass
    return c


def lathe(profile, segments=20, cap_bottom=True, cap_top=True, origin=(0, 0, 0)):
    ox, oy, oz = origin
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        ring = []
        for i in range(segments):
            a = i / segments * PI2
            ring.append(bm.verts.new((ox + r * math.cos(a), oy + r * math.sin(a), oz + z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        add_face_ring(bm, rings[i], rings[i + 1])
    if cap_bottom and profile[0][0] > 1e-4:
        cap_ring(bm, rings[0], Vector((ox, oy, oz + profile[0][1])), flip=True)
    if cap_top and profile[-1][0] > 1e-4:
        cap_ring(bm, rings[-1], Vector((ox, oy, oz + profile[-1][1])), flip=False)
    return bm


def box(center, size):
    bm = bmesh.new()
    cx, cy, cz = center
    sx, sy, sz = size[0] * 0.5, size[1] * 0.5, size[2] * 0.5
    coords = [
        (cx - sx, cy - sy, cz - sz), (cx + sx, cy - sy, cz - sz),
        (cx + sx, cy + sy, cz - sz), (cx - sx, cy + sy, cz - sz),
        (cx - sx, cy - sy, cz + sz), (cx + sx, cy - sy, cz + sz),
        (cx + sx, cy + sy, cz + sz), (cx - sx, cy + sy, cz + sz),
    ]
    vs = [bm.verts.new(c) for c in coords]
    for f in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
        bm.faces.new([vs[i] for i in f])
    return bm


def ellipsoid(center, radii, segs=12, rings=8):
    c = Vector(center)
    rx, ry, rz = radii
    bm = bmesh.new()
    verts = []
    for y in range(rings + 1):
        phi = y / rings * math.pi
        sy = math.cos(phi)
        r = math.sin(phi)
        row = []
        for x in range(segs):
            th = x / segs * PI2
            row.append(bm.verts.new(c + Vector((math.cos(th) * r * rx, math.sin(th) * r * ry, sy * rz))))
        verts.append(row)
    for y in range(rings):
        add_face_ring(bm, verts[y], verts[y + 1])
    return bm


def count_tris(meshes):
    n = 0
    for o in meshes:
        me = o.data
        me.calc_loop_triangles()
        n += len(me.loop_triangles)
    return n


# ---------------------------------------------------------------------------
# Load CC0 body
# ---------------------------------------------------------------------------
def load_base():
    if not os.path.isfile(BASE):
        raise FileNotFoundError("Missing " + BASE)
    bpy.ops.wm.open_mainfile(filepath=BASE)
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 1.0
    sc.render.fps = 30

    body = bpy.data.objects.get("GEO-body_male_realistic")
    if body is None:
        raise RuntimeError("male body not in base blend: " + ", ".join(o.name for o in bpy.data.objects))
    eye_objs = [o for o in bpy.data.objects
                if o.name.startswith("GEO-body_male_realistic.eye") and o != body]
    for m in list(body.modifiers):
        body.modifiers.remove(m)

    # World-space feet-to-origin, then apply, then uniform scale to 1.78 m.
    def world_pts(obj):
        mw = obj.matrix_world
        return [mw @ v.co for v in obj.data.vertices]

    pts = world_pts(body)
    minz = min(p.z for p in pts)
    cx = (min(p.x for p in pts) + max(p.x for p in pts)) * 0.5
    cy = 0.0
    shift = Vector((cx, cy, minz))
    for o in [body] + eye_objs:
        o.location -= shift
        apply_all(o)

    zs = [v.co.z for v in body.data.vertices]
    h = max(zs) - min(zs)
    scale = TARGET_H / max(h, 1e-4)
    for o in [body] + eye_objs:
        o.scale = (scale, scale, scale)
        apply_all(o)

    body.name = "Body"
    for i, e in enumerate(eye_objs):
        e.name = "Eye." + ("L" if e.location.x < 0 else "R")
    clean_mesh(body)
    shade_smooth(body)
    for e in eye_objs:
        clean_mesh(e)
        shade_smooth(e)
    return body, eye_objs


def mesh_stats(obj):
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    return {
        "xmin": min(xs), "xmax": max(xs),
        "ymin": min(ys), "ymax": max(ys),
        "zmin": min(zs), "zmax": max(zs),
        "h": max(zs) - min(zs),
    }


# ---------------------------------------------------------------------------
# Clothes from body regions + extra details
# ---------------------------------------------------------------------------
def region_cloth(body, name, keep_fn, inflate_amt, solid=0.007, folds=0.004):
    obj = dup_mesh(body, name)
    delete_verts(obj, keep_fn)
    if len(obj.data.vertices) < 8:
        bpy.data.objects.remove(obj, do_unlink=True)
        return None
    inflate(obj, inflate_amt)
    if folds:
        wrinkle(obj, folds)
    if solid:
        solidify(obj, solid)
    clean_mesh(obj)
    shade_smooth(obj)
    return obj


def paint_body_mats(obj, mats, st):
    """Skin on head/hands/neck, olive jacket on torso+sleeves, pants, rubber boots."""
    me = obj.data
    me.materials.clear()
    for key in ("skin", "jacket", "pants", "boots"):
        me.materials.append(mats[key])
    h = st["h"]
    xmax = st["xmax"]
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    hand_x = 0.80 * xmax
    head_z = 0.84 * h
    hip_z = 0.53 * h
    boot_z = 0.155 * h
    for f in bm.faces:
        c = f.calc_center_median()
        if c.z > head_z or abs(c.x) > hand_x:
            f.material_index = 0
        elif c.z < boot_z:
            f.material_index = 3
        elif c.z < hip_z:
            f.material_index = 2
        else:
            f.material_index = 1
    bm.to_mesh(me)
    bm.free()
    me.update()


def make_clothes(body, st):
    h = st["h"]
    xmax = st["xmax"]
    ymin = st["ymin"]
    neck_z = 0.86 * h
    hip_z = 0.53 * h

    def torso_keep(p):
        if p.z < hip_z - 0.01 or p.z > neck_z:
            return False
        return abs(p.x) <= 0.20

    def vest_keep(p):
        return (hip_z + 0.10 < p.z < neck_z - 0.06
                and abs(p.x) < 0.16
                and p.y < 0.04)

    def hair_keep(p):
        return p.z > 0.93 * h and p.y > -0.02

    jacket = region_cloth(body, "Jacket", torso_keep, 0.016, solid=0.0, folds=0.003)
    vest = region_cloth(body, "Vest", vest_keep, 0.022, solid=0.0, folds=0.002)
    hair = region_cloth(body, "Hair", hair_keep, 0.008, solid=0.0, folds=0.0)

    collar = bm_to_obj("Collar", lathe([
        (0.052, neck_z - 0.015),
        (0.068, neck_z + 0.005),
        (0.074, neck_z + 0.032),
        (0.058, neck_z + 0.042),
    ], segments=18, cap_bottom=False, cap_top=True, origin=(0, 0.01, 0)))
    zipper = bm_to_obj("Zipper", box(
        (0, ymin + 0.035, (hip_z + neck_z) * 0.52),
        (0.016, 0.010, (neck_z - hip_z) * 0.70)))
    pockets = []
    for sx in (-1, 1):
        pockets.append(bm_to_obj(f"JPocket{sx}", box(
            (sx * 0.085, ymin + 0.045, hip_z + 0.13), (0.085, 0.024, 0.09))))
        pockets.append(bm_to_obj(f"JFlap{sx}", box(
            (sx * 0.085, ymin + 0.032, hip_z + 0.175), (0.088, 0.016, 0.026))))
    hem = bm_to_obj("Hem", lathe([
        (0.145, hip_z - 0.02),
        (0.158, hip_z - 0.005),
        (0.148, hip_z + 0.018),
    ], segments=20))
    if jacket:
        jacket = join_objects("Jacket", [jacket, collar, zipper, hem] + pockets)
        smart_uv(jacket)
        finalize_mesh(jacket)

    vest_bits = []
    for sx in (-1, 1):
        vest_bits.append(bm_to_obj(f"VPocket{sx}", box(
            (sx * 0.075, ymin + 0.028, 0.70 * h), (0.075, 0.022, 0.08))))
    vest_bits.append(bm_to_obj("VZip", box((0, ymin + 0.02, 0.72 * h), (0.028, 0.012, 0.24))))
    if vest:
        vest = join_objects("Vest", [vest] + vest_bits)
        smart_uv(vest)
        finalize_mesh(vest)

    belt = bm_to_obj("Belt", lathe([
        (0.138, hip_z - 0.005),
        (0.148, hip_z + 0.012),
        (0.138, hip_z + 0.032),
    ], segments=20))
    buckle = bm_to_obj("Buckle", box((0, ymin + 0.055, hip_z + 0.014), (0.046, 0.016, 0.032)))
    pants = join_objects("Pants", [belt, buckle])
    smart_uv(pants)
    finalize_mesh(pants)

    boot_bits = []
    for sx in (-1, 1):
        foot = [v.co for v in body.data.vertices if sx * v.co.x > 0.03 and v.co.z < 0.10]
        if not foot:
            continue
        cx = sum(p.x for p in foot) / len(foot)
        cy = sum(p.y for p in foot) / len(foot)
        boot_bits.append(bm_to_obj(f"Shaft{sx}", lathe(
            [(0.055, 0.04), (0.058, 0.10), (0.052, 0.20)],
            segments=16, cap_bottom=False, cap_top=True, origin=(cx, cy, 0))))
        boot_bits.append(bm_to_obj(f"Sole{sx}", box((cx, cy - 0.03, 0.016), (0.095, 0.24, 0.032))))
        boot_bits.append(bm_to_obj(f"Heel{sx}", box((cx, cy + 0.07, 0.028), (0.085, 0.07, 0.04))))
    boots = join_objects("Boots", boot_bits) if boot_bits else None
    if boots:
        smart_uv(boots)
        # Joined lathe shafts + box soles. A slightly larger weld kills
        # T-junctions that produced Unity "invalid normals" on Boots.
        finalize_mesh(boots, merge=0.0008)

    cap_z = 0.97 * h
    crown = bm_to_obj("Crown", lathe([
        (0.102, cap_z - 0.02),
        (0.110, cap_z + 0.00),
        (0.100, cap_z + 0.040),
        (0.055, cap_z + 0.058),
        (0.000, cap_z + 0.064),
    ], segments=18, cap_bottom=True, cap_top=True, origin=(0, 0.00, 0)))
    visor = bm_to_obj("Visor", box((0, -0.11, cap_z - 0.008), (0.15, 0.09, 0.014)))
    cap = join_objects("Cap", [crown, visor])
    smart_uv(cap)
    finalize_mesh(cap)
    if hair:
        smart_uv(hair)
        finalize_mesh(hair)

    return jacket, vest, pants, boots, hair, cap


# ---------------------------------------------------------------------------
# Armature
# ---------------------------------------------------------------------------
def avg_verts(obj, pred):
    pts = [v.co.copy() for v in obj.data.vertices if pred(v.co)]
    if not pts:
        return None
    s = Vector((0, 0, 0))
    for p in pts:
        s += p
    return s / len(pts)


def make_armature(body, st):
    h = st["h"]
    xmax = st["xmax"]

    def P(pred, fallback):
        v = avg_verts(body, pred)
        return v if v is not None else Vector(fallback)

    hips = P(lambda p: abs(p.z - 0.53 * h) < 0.03 and abs(p.x) < 0.08, (0, 0, 0.94))
    hips.x = 0
    chest = P(lambda p: abs(p.z - 0.72 * h) < 0.03 and abs(p.x) < 0.08, (0, 0.02, 1.28))
    chest.x = 0
    upper = P(lambda p: abs(p.z - 0.80 * h) < 0.03 and abs(p.x) < 0.08, (0, 0.02, 1.42))
    upper.x = 0
    neck = P(lambda p: abs(p.z - 0.87 * h) < 0.02 and abs(p.x) < 0.06, (0, 0.01, 1.54))
    neck.x = 0
    head = P(lambda p: p.z > 0.92 * h and abs(p.x) < 0.08, (0, 0.0, 1.66))
    head.x = 0
    head_top = Vector((0, 0, st["zmax"] - 0.02))

    l_sh = P(lambda p: abs(p.z - 0.81 * h) < 0.03 and p.x < -0.12 and p.x > -0.22,
             (-0.16, 0.02, 0.81 * h))
    r_sh = Vector((-l_sh.x, l_sh.y, l_sh.z))
    l_el = P(lambda p: abs(p.z - 0.80 * h) < 0.05 and -0.36 < p.x < -0.26,
             (-0.32, 0.02, 0.80 * h))
    r_el = Vector((-l_el.x, l_el.y, l_el.z))
    l_wr = P(lambda p: abs(p.z - 0.79 * h) < 0.06 and p.x < -0.36,
             (-0.42, 0.02, 0.79 * h))
    r_wr = Vector((-l_wr.x, l_wr.y, l_wr.z))
    l_hd = P(lambda p: p.x < -0.38, (-0.48, 0.02, 0.79 * h))
    r_hd = Vector((-l_hd.x, l_hd.y, l_hd.z))

    l_hip = P(lambda p: abs(p.z - 0.52 * h) < 0.03 and p.x < -0.06,
              (-0.10, 0.01, 0.52 * h))
    r_hip = Vector((-l_hip.x, l_hip.y, l_hip.z))
    l_kn = P(lambda p: abs(p.z - 0.29 * h) < 0.04 and p.x < -0.05,
             (-0.11, 0.02, 0.29 * h))
    r_kn = Vector((-l_kn.x, l_kn.y, l_kn.z))
    l_an = P(lambda p: p.z < 0.08 and p.x < -0.04, (-0.11, 0.03, 0.07))
    r_an = Vector((-l_an.x, l_an.y, l_an.z))
    l_to = P(lambda p: p.z < 0.06 and p.x < -0.04 and p.y < -0.04,
             (l_an.x, l_an.y - 0.12, 0.03))
    r_to = Vector((-l_to.x, l_to.y, l_to.z))

    arm_data = bpy.data.armatures.new("FishermanRig")
    arm_data.display_type = "STICK"
    arm = bpy.data.objects.new("SM_Fisherman", arm_data)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones

    def bone(name, parent, head, tail):
        b = eb.new(name)
        b.head = Vector(head)
        b.tail = Vector(tail)
        b.use_deform = True
        if parent:
            b.parent = eb[parent]
            b.use_connect = False
        return b

    bone("Hips", None, (hips.x, hips.y, hips.z - 0.04), (hips.x, hips.y, hips.z + 0.08))
    bone("Spine", "Hips", (hips.x, hips.y + 0.01, hips.z + 0.08), (chest.x, chest.y, chest.z))
    bone("Spine1", "Spine", (chest.x, chest.y, chest.z), (upper.x, upper.y, upper.z - 0.04))
    bone("Spine2", "Spine1", (upper.x, upper.y, upper.z - 0.04), (neck.x, neck.y, neck.z - 0.02))
    bone("Neck", "Spine2", (neck.x, neck.y, neck.z - 0.02), (head.x, head.y, head.z))
    bone("Head", "Neck", (head.x, head.y, head.z), (head_top.x, head_top.y, head_top.z))

    bone("LeftShoulder", "Spine2", (0.0, upper.y, upper.z), (l_sh.x, l_sh.y, l_sh.z))
    bone("LeftArm", "LeftShoulder", (l_sh.x, l_sh.y, l_sh.z), (l_el.x, l_el.y, l_el.z))
    bone("LeftForeArm", "LeftArm", (l_el.x, l_el.y, l_el.z), (l_wr.x, l_wr.y, l_wr.z))
    bone("LeftHand", "LeftForeArm", (l_wr.x, l_wr.y, l_wr.z), (l_hd.x, l_hd.y, l_hd.z))

    bone("RightShoulder", "Spine2", (0.0, upper.y, upper.z), (r_sh.x, r_sh.y, r_sh.z))
    bone("RightArm", "RightShoulder", (r_sh.x, r_sh.y, r_sh.z), (r_el.x, r_el.y, r_el.z))
    bone("RightForeArm", "RightArm", (r_el.x, r_el.y, r_el.z), (r_wr.x, r_wr.y, r_wr.z))
    bone("RightHand", "RightForeArm", (r_wr.x, r_wr.y, r_wr.z), (r_hd.x, r_hd.y, r_hd.z))

    def fingers(side, sign, hand):
        names = ["Thumb", "Index", "Middle", "Ring", "Pinky"]
        zoff = [0.00, 0.018, 0.012, 0.004, -0.008]
        yoff = [0.025, 0.010, 0.008, 0.006, 0.004]
        leng = [0.038, 0.048, 0.052, 0.046, 0.036]
        for i, n in enumerate(names):
            p = f"{side}Hand"
            x0 = hand.x
            for k in range(1, 3):
                nm = f"{side}Hand{n}{k}"
                x1 = x0 + sign * leng[i] * (0.7 if k > 1 else 1.0)
                z = hand.z + zoff[i]
                y = hand.y + (yoff[i] if n != "Thumb" else 0.04 + k * 0.008)
                if n == "Thumb":
                    z = hand.z - 0.012
                bone(nm, p, (x0, y, z), (x1, y, z))
                p = nm
                x0 = x1

    fingers("Left", -1, l_hd)
    fingers("Right", 1, r_hd)

    bone("LeftUpLeg", "Hips", (l_hip.x, l_hip.y, hips.z), (l_kn.x, l_kn.y, l_kn.z))
    bone("LeftLeg", "LeftUpLeg", (l_kn.x, l_kn.y, l_kn.z), (l_an.x, l_an.y, l_an.z))
    bone("LeftFoot", "LeftLeg", (l_an.x, l_an.y, l_an.z), (l_to.x, l_to.y, l_to.z))
    bone("LeftToeBase", "LeftFoot", (l_to.x, l_to.y, l_to.z), (l_to.x, l_to.y - 0.05, l_to.z))

    bone("RightUpLeg", "Hips", (r_hip.x, r_hip.y, hips.z), (r_kn.x, r_kn.y, r_kn.z))
    bone("RightLeg", "RightUpLeg", (r_kn.x, r_kn.y, r_kn.z), (r_an.x, r_an.y, r_an.z))
    bone("RightFoot", "RightLeg", (r_an.x, r_an.y, r_an.z), (r_to.x, r_to.y, r_to.z))
    bone("RightToeBase", "RightFoot", (r_to.x, r_to.y, r_to.z), (r_to.x, r_to.y - 0.05, r_to.z))

    bpy.ops.object.mode_set(mode="OBJECT")
    return arm, {
        "hips": hips, "head": head, "l_hd": l_hd, "r_hd": r_hd,
        "l_wr": l_wr, "r_wr": r_wr, "upper": upper,
    }


def make_sockets(arm, joints):
    r_hd = joints["r_hd"]
    l_hd = joints["l_hd"]
    sockets = {
        "RightHandGrip": ("RightHand", (0.04, 0.0, 0.0)),
        "LeftHandGrip": ("LeftHand", (-0.04, 0.0, 0.0)),
        "RodGrip": ("RightHand", (0.05, 0.01, 0.0)),
        "RodSupport": ("LeftHand", (-0.04, 0.01, 0.0)),
        "HeadLook": ("Head", (0.0, -0.12, 0.04)),
        "Chest": ("Spine2", (0.0, 0.08, 0.0)),
        "Hips": ("Hips", (0.0, 0.0, 0.0)),
        "BackRodMount": ("Spine2", (0.10, 0.11, 0.02)),
        "BackpackMount": ("Spine2", (0.0, 0.13, 0.0)),
        "HipAccessoryMount": ("Hips", (0.14, 0.04, -0.02)),
    }
    created = []
    for name, (bone, loc) in sockets.items():
        o = bpy.data.objects.new(name, None)
        o.empty_display_type = "PLAIN_AXES"
        o.empty_display_size = 0.04
        o.parent = arm
        o.parent_type = "BONE"
        o.parent_bone = bone
        o.location = loc
        bpy.context.collection.objects.link(o)
        created.append(o)
    return created


def skin(arm, meshes):
    meshes = [m for m in meshes if m is not None]
    select_only(meshes + [arm])
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    bpy.ops.object.select_all(action="DESELECT")


# ---------------------------------------------------------------------------
# Textures / materials  (art bible palette)
# ---------------------------------------------------------------------------
def noise2(x, y):
    return math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1.0


def save_tex(name, size, fn):
    img = bpy.data.images.new(name, width=size, height=size, alpha=False)
    pix = [0.0] * (size * size * 4)
    for y in range(size):
        v = y / size
        for x in range(size):
            u = x / size
            r, g, b = fn(u, v)
            i = (y * size + x) * 4
            pix[i] = r
            pix[i + 1] = g
            pix[i + 2] = b
            pix[i + 3] = 1.0
    img.pixels = pix
    path = os.path.join(TEX, name + ".png")
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    return img


def tex_skin(u, v):
    n = 0.035 * noise2(u * 16, v * 12)
    stubble = 0.0
    if 0.38 < v < 0.58 and abs(u - 0.5) < 0.22:
        stubble = 0.10 * (0.4 + noise2(u * 55, v * 48))
    return (0.76 + n - stubble, 0.58 + n * 0.65 - stubble * 0.8, 0.45 + n * 0.4 - stubble * 0.6)


def tex_jacket(u, v):
    weave = 0.035 * ((int(u * 96) + int(v * 96)) % 2)
    n = 0.03 * noise2(u * 8, v * 6)
    seam = 0.06 if abs(u - 0.5) < 0.012 else 0.0
    return (0.30 + weave + n - seam, 0.36 + weave + n - seam, 0.22 + n - seam)


def tex_vest(u, v):
    n = 0.03 * noise2(u * 10, v * 7)
    return (0.22 + n, 0.27 + n, 0.17 + n)


def tex_pants(u, v):
    n = 0.04 * noise2(u * 11, v * 5)
    return (0.22 + n, 0.22 + n, 0.18 + n)


def tex_boots(u, v):
    n = 0.04 * noise2(u * 18, v * 7)
    return (0.10 + n, 0.13 + n, 0.10 + n)


def tex_cap(u, v):
    n = 0.04 * noise2(u * 9, v * 9)
    return (0.41 + n, 0.34 + n, 0.21 + n)


def tex_hair(u, v):
    n = 0.05 * noise2(u * 28, v * 7)
    return (0.12 + n, 0.09 + n, 0.07 + n)


def tex_normal(u, v):
    return (0.5 + 0.12 * math.sin(u * 70), 0.5 + 0.12 * math.sin(v * 70), 1.0)


def make_mat(name, img, roughness=0.55, spec=0.2):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = spec
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def assign(obj, mat):
    if obj is None:
        return
    obj.data.materials.clear()
    obj.data.materials.append(mat)


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------
def export_fbx(path, objects):
    """Write real normals/tangents. FACE smoothing groups made Unity report
    'has no normals' and skip LayerElementNormal."""
    select_only(objects)
    kwargs = dict(
        filepath=path,
        use_selection=True,
        object_types={"ARMATURE", "MESH", "EMPTY"},
        use_mesh_modifiers=True,
        mesh_smooth_type="OFF",
        use_tspace=True,
        add_leaf_bones=False,
        use_armature_deform_only=True,
        primary_bone_axis="Y",
        secondary_bone_axis="X",
        armature_nodetype="NULL",
        bake_anim=False,
        axis_forward="-Z",
        axis_up="Y",
        apply_scale_options="FBX_SCALE_ALL",
        apply_unit_scale=True,
        path_mode="COPY",
        embed_textures=True,
        bake_space_transform=True,
    )
    try:
        bpy.ops.export_scene.fbx(**kwargs)
    except Exception as e:
        log("FBX tangents failed (" + str(e) + ") — retry without tspace")
        kwargs["use_tspace"] = False
        bpy.ops.export_scene.fbx(**kwargs)


def export_glb(path, objects):
    select_only(objects)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
        export_skins=True,
        export_texcoords=True,
        export_normals=True,
        export_cameras=False,
        export_lights=False,
    )


def decimate_copy(obj, ratio, name):
    d = obj.copy()
    d.data = obj.data.copy()
    d.name = name
    d.data.name = name
    bpy.context.collection.objects.link(d)
    mod = d.modifiers.new("LOD", "DECIMATE")
    mod.ratio = ratio
    select_only([d])
    bpy.ops.object.modifier_apply(modifier="LOD")
    finalize_mesh(d)
    return d


def preview_render(path, loc, rot, size=1024):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = False
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.filepath = path
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False

    if scene.world is None:
        world = bpy.data.worlds.new("World")
        scene.world = world
        world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.52, 0.60, 0.56, 1)
        bg.inputs[1].default_value = 1.1

    cam = bpy.data.objects.get("PrevCam")
    if cam is None:
        cam_data = bpy.data.cameras.new("PrevCam")
        cam = bpy.data.objects.new("PrevCam", cam_data)
        bpy.context.collection.objects.link(cam)
        scene.camera = cam
        key = bpy.data.lights.new("Key", "SUN")
        key.energy = 3.2
        key_o = bpy.data.objects.new("Key", key)
        key_o.rotation_euler = Euler((math.radians(42), math.radians(12), math.radians(28)), "XYZ")
        bpy.context.collection.objects.link(key_o)
        fill = bpy.data.lights.new("Fill", "SUN")
        fill.energy = 0.7
        fill_o = bpy.data.objects.new("Fill", fill)
        fill_o.rotation_euler = Euler((math.radians(18), math.radians(-50), 0), "XYZ")
        bpy.context.collection.objects.link(fill_o)
        rim = bpy.data.lights.new("Rim", "SUN")
        rim.energy = 0.9
        rim_o = bpy.data.objects.new("Rim", rim)
        rim_o.rotation_euler = Euler((math.radians(70), math.radians(160), 0), "XYZ")
        bpy.context.collection.objects.link(rim_o)
    cam.location = loc
    cam.rotation_euler = Euler(rot, "XYZ")
    scene.camera = cam
    bpy.ops.render.render(write_still=True)


def write_report(tris0, tris1, tris2, st, hygiene):
    path = os.path.join(DOC, "MODEL.md")
    with open(path, "w") as f:
        f.write("# SM_Fisherman\n\n")
        f.write("- Format: FBX (binary) + GLB\n")
        f.write("- Body: Blender Studio Human Base Meshes v1.4.1, `GEO-body_male_realistic`, **CC0**\n")
        f.write("- Clothes / hair / cap / boots / sockets / rig: original Blender Python (`tools/fisherman/build_fisherman.py`)\n")
        f.write("- License: CC0 (body) + original (clothes/rig) → commercial use OK, body needs no attribution\n")
        f.write("- Rig: Mixamo-style Unity Humanoid names, T-pose\n")
        f.write(f"- Height: {st['h']:.3f} m (target 1.78)\n")
        f.write(f"- LOD0 triangles: {tris0}\n")
        f.write(f"- LOD1 triangles: {tris1}\n")
        f.write(f"- LOD2 triangles: {tris2}\n")
        f.write("- Files: `SM_Fisherman_LOD0.fbx`, `SM_Fisherman_LOD1.fbx`, `SM_Fisherman_LOD2.fbx`\n")
        f.write("- Runtime: `Resources/SM_Fisherman.fbx` (copy of LOD0, no LOD siblings in that folder)\n")
        f.write("- Export: triangulated, custom split normals, FBX `mesh_smooth_type=OFF`, tangents on, leaf bones off\n")
        f.write("- Sockets: RightHandGrip, LeftHandGrip, RodGrip, RodSupport, HeadLook, Chest, Hips, BackRodMount, BackpackMount, HipAccessoryMount\n")
        f.write("- Anim clips: none in this pass (rig is pose-ready; FishermanBody drives IDLE..LAND)\n")
        f.write("- Preview PNGs in this folder are **Blender Cycles**, not Unity Play Mode\n")
        f.write("\n## mesh.validate / normals\n\n")
        f.write("| Mesh | verts | tris | non-tri | zero/NaN normals substituted | validate() changed |\n")
        f.write("|---|---:|---:|---:|---:|---|\n")
        for h in hygiene:
            f.write(f"| {h['name']} | {h['verts']} | {h['tris']} | {h['nontri']} | {h['zero_n']} | {h['validate']} |\n")


def inspect_exported_fbx(path, expected_lod):
    """Re-import FBX in a blank scene and fail on missing/invalid normals or LOD names."""
    log("Inspect " + path)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=path)
    issues = []
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    if not meshes:
        issues.append("no meshes")
    suffix = None if expected_lod is None else "_" + expected_lod
    for o in meshes:
        me = o.data
        if suffix and not o.name.endswith(suffix):
            issues.append(f"{o.name}: expected suffix {suffix}")
        nontri = sum(1 for p in me.polygons if p.loop_total != 3)
        if nontri:
            issues.append(f"{o.name}: {nontri} non-triangle faces")
        me.update()
        me.calc_loop_triangles()
        bad = 0
        for v in me.vertices:
            n = v.normal
            if n.length_squared < 1e-16 or any(math.isnan(c) for c in n):
                bad += 1
        if bad:
            issues.append(f"{o.name}: {bad} vertices with invalid normals")
        if len(me.polygons) == 0:
            issues.append(f"{o.name}: empty mesh")
        log(f"  import {o.name}: verts={len(me.vertices)} polys={len(me.polygons)} "
            f"tris={len(me.loop_triangles)} custom_n={getattr(me, 'has_custom_normals', False)}")
    if issues:
        for i in issues:
            log("  FAIL " + i)
        raise RuntimeError("FBX inspect failed for " + path + ": " + "; ".join(issues))
    log("  OK " + str(len(meshes)) + " meshes")


def _lod_base(name):
    for s in ("_LOD0", "_LOD1", "_LOD2"):
        if name.endswith(s):
            return name[:-len(s)]
    return name


def main():
    log("Loading CC0 male body…")
    body, eyes = load_base()
    st = mesh_stats(body)
    log(f"Body height={st['h']:.3f} x={st['xmin']:.3f}..{st['xmax']:.3f} y={st['ymin']:.3f}..{st['ymax']:.3f}")

    log("Clothes…")
    jacket, vest, pants, boots, hair, cap = make_clothes(body, st)

    log("Textures…")
    img_skin = save_tex("T_Fisherman_Skin_D", 1024, tex_skin)
    img_jack = save_tex("T_Fisherman_Jacket_D", 1024, tex_jacket)
    img_vest = save_tex("T_Fisherman_Vest_D", 512, tex_vest)
    img_pants = save_tex("T_Fisherman_Pants_D", 512, tex_pants)
    img_boot = save_tex("T_Fisherman_Boots_D", 512, tex_boots)
    img_cap = save_tex("T_Fisherman_Cap_D", 512, tex_cap)
    img_hair = save_tex("T_Fisherman_Hair_D", 256, tex_hair)
    save_tex("T_Fisherman_Cloth_N", 512, tex_normal)

    mats = {
        "skin": make_mat("M_Fisherman_Skin", img_skin, 0.48, 0.32),
        "jacket": make_mat("M_Fisherman_Jacket", img_jack, 0.64, 0.14),
        "vest": make_mat("M_Fisherman_Vest", img_vest, 0.60, 0.12),
        "pants": make_mat("M_Fisherman_Pants", img_pants, 0.72, 0.10),
        "boots": make_mat("M_Fisherman_Boots", img_boot, 0.38, 0.22),
        "cap": make_mat("M_Fisherman_Cap", img_cap, 0.62, 0.12),
        "hair": make_mat("M_Fisherman_Hair", img_hair, 0.78, 0.08),
    }
    paint_body_mats(body, mats, st)
    for e in eyes:
        assign(e, mats["skin"])
    assign(jacket, mats["jacket"])
    assign(vest, mats["vest"])
    assign(pants, mats["pants"])
    assign(boots, mats["boots"])
    assign(cap, mats["cap"])
    assign(hair, mats["hair"])

    lod0 = [o for o in [body] + eyes + [jacket, vest, pants, boots, hair, cap] if o]

    log("Finalize LOD0…")
    hygiene = [finalize_mesh(o) for o in lod0]

    log("Armature…")
    arm, joints = make_armature(body, st)
    sockets = make_sockets(arm, joints)

    log("LOD copies…")
    lod1, lod2 = [], []
    for o in lod0:
        base = _lod_base(o.name)
        lod1.append(decimate_copy(o, 0.50, base + "_LOD1"))
        lod2.append(decimate_copy(o, 0.25, base + "_LOD2"))
    for o in lod0:
        base = _lod_base(o.name)
        o.name = base + "_LOD0"
        o.data.name = o.name
    hygiene = [finalize_mesh(o) for o in lod0]
    hygiene += [finalize_mesh(o) for o in lod1]
    hygiene += [finalize_mesh(o) for o in lod2]

    log("Skinning…")
    skin(arm, lod0)
    skin(arm, lod1)
    skin(arm, lod2)
    for o in lod1 + lod2:
        o.hide_set(True)
        o.hide_render = True

    tris0 = count_tris(lod0)
    tris1 = count_tris(lod1)
    tris2 = count_tris(lod2)
    log(f"LOD0 {tris0} LOD1 {tris1} LOD2 {tris2}")

    blend_path = os.path.join(SRC, "SM_Fisherman.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    log("Saved " + blend_path)

    fbx_lod0 = os.path.join(MOD, "SM_Fisherman_LOD0.fbx")
    export_fbx(fbx_lod0, [arm] + lod0 + sockets)
    fbx_res = os.path.join(RES, "SM_Fisherman.fbx")
    export_fbx(fbx_res, [arm] + lod0 + sockets)
    legacy = os.path.join(MOD, "SM_Fisherman.fbx")
    if os.path.isfile(legacy):
        os.remove(legacy)
        log("Removed mixed-scheme " + legacy)
    glb0 = os.path.join(MOD, "SM_Fisherman.glb")
    try:
        export_glb(glb0, [arm] + lod0 + sockets)
    except Exception as e:
        log("GLB export skipped: " + str(e))

    for o in lod0:
        o.hide_set(True)
    for o in lod1:
        o.hide_set(False)
    export_fbx(os.path.join(MOD, "SM_Fisherman_LOD1.fbx"), [arm] + lod1 + sockets)
    for o in lod1:
        o.hide_set(True)
    for o in lod2:
        o.hide_set(False)
    export_fbx(os.path.join(MOD, "SM_Fisherman_LOD2.fbx"), [arm] + lod2 + sockets)
    for o in lod0:
        o.hide_set(False)
    for o in lod1 + lod2:
        o.hide_set(True)

    write_report(tris0, tris1, tris2, st, hygiene)

    if os.environ.get("RM_SKIP_PREVIEW") != "1":
        try:
            preview_render(os.path.join(DOC, "preview_front.png"),
                           (0.15, -2.55, 1.15),
                           (math.radians(78), 0, math.radians(4)))
            preview_render(os.path.join(DOC, "preview_threequarter.png"),
                           (1.55, -2.15, 1.25),
                           (math.radians(72), 0, math.radians(36)))
            preview_render(os.path.join(DOC, "preview_side.png"),
                           (2.6, 0.15, 1.15),
                           (math.radians(82), 0, math.radians(90)))
        except Exception as e:
            log("Preview render skipped: " + str(e))

    inspect_exported_fbx(fbx_lod0, "LOD0")
    inspect_exported_fbx(os.path.join(MOD, "SM_Fisherman_LOD1.fbx"), "LOD1")
    inspect_exported_fbx(os.path.join(MOD, "SM_Fisherman_LOD2.fbx"), "LOD2")
    inspect_exported_fbx(fbx_res, "LOD0")

    failed = [h for h in hygiene if h["nontri"] or h["zero_n"]]
    if failed:
        log("WARN meshes needed normal substitution or had non-tris: " +
            ", ".join(h["name"] for h in failed))
    log("DONE " + fbx_lod0 + " tris " + str(tris0))


if __name__ == "__main__":
    main()
