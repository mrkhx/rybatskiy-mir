#!/usr/bin/env python3
"""Build skinned GLB prototypes: fisherman, spinning rod, pike.

No Blender. Real glTF 2.0 skins + AnimationMixer clips + named anchors.
"""
from __future__ import annotations

import json
import math
import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/models/rig3d"
ART = ROOT / "artifacts/rig3d"
_MASTER = Path("/workspace/artifacts/char-rig/master-a-pose.png")
MASTER = _MASTER if _MASTER.exists() else ROOT / "artifacts/char-rig/master-a-pose.png"
_PIKE = Path("/workspace/artifacts/imagine_images/a1936937-4deb-4977-9ab3-56a067333d3a.jpg")
PIKE_SRC = _PIKE if _PIKE.exists() else ROOT / "artifacts/imagine_images/a1936937-4deb-4977-9ab3-56a067333d3a.jpg"

VEC3 = 5126, 3
VEC4 = 5126, 4
VEC4U = 5123, 4
SCALAR = 5126, 1
MAT4 = 5126, 16


# ---------------------------------------------------------------------------
# math
# ---------------------------------------------------------------------------
def v3(x, y, z):
    return np.array([x, y, z], dtype=np.float64)


def norm(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-8 else v


def quat_mul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return np.array(
        [
            aw * bx + ax * bw + ay * bz - az * by,
            aw * by - ax * bz + ay * bw + az * bx,
            aw * bz + ax * by - ay * bx + az * bw,
            aw * bw - ax * bx - ay * by - az * bz,
        ],
        dtype=np.float64,
    )


def quat_from_axis_angle(axis, rad):
    axis = norm(np.asarray(axis, dtype=np.float64))
    s = math.sin(rad * 0.5)
    return np.array([axis[0] * s, axis[1] * s, axis[2] * s, math.cos(rad * 0.5)])


def quat_from_euler(rx, ry, rz):
    qx = quat_from_axis_angle((1, 0, 0), rx)
    qy = quat_from_axis_angle((0, 1, 0), ry)
    qz = quat_from_axis_angle((0, 0, 1), rz)
    return quat_mul(quat_mul(qz, qy), qx)


def quat_ident():
    return np.array([0.0, 0.0, 0.0, 1.0])


def mat4_from_trs(t, q, s=None):
    x, y, z, w = q
    xx, yy, zz = x * x, y * y, z * z
    xy, xz, yz = x * y, x * z, y * z
    wx, wy, wz = w * x, w * y, w * z
    m = np.eye(4, dtype=np.float32)
    m[0, 0] = 1 - 2 * (yy + zz)
    m[0, 1] = 2 * (xy - wz)
    m[0, 2] = 2 * (xz + wy)
    m[1, 0] = 2 * (xy + wz)
    m[1, 1] = 1 - 2 * (xx + zz)
    m[1, 2] = 2 * (yz - wx)
    m[2, 0] = 2 * (xz - wy)
    m[2, 1] = 2 * (yz + wx)
    m[2, 2] = 1 - 2 * (xx + yy)
    if s is not None:
        m[0, :3] *= s[0]
        m[1, :3] *= s[1]
        m[2, :3] *= s[2]
    m[0, 3], m[1, 3], m[2, 3] = t
    return m


def look_basis(direction, up=v3(0, 1, 0)):
    """Columns: X, Y=bone-dir, Z. Right-handed."""
    y = norm(direction)
    up = np.asarray(up, dtype=np.float64)
    if abs(np.dot(y, up)) > 0.98:
        up = v3(0, 0, 1) if abs(y[1]) > 0.9 else v3(0, 1, 0)
    x = norm(np.cross(up, y))
    if np.linalg.norm(x) < 1e-6:
        x = v3(1, 0, 0)
    z = norm(np.cross(x, y))
    m = np.eye(4, dtype=np.float64)
    m[:3, 0] = x
    m[:3, 1] = y
    m[:3, 2] = z
    return m


def quat_from_basis(basis4):
    r = basis4[:3, :3]
    t = np.trace(r)
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        w = 0.25 * s
        x = (r[2, 1] - r[1, 2]) / s
        y = (r[0, 2] - r[2, 0]) / s
        z = (r[1, 0] - r[0, 1]) / s
    elif r[0, 0] > r[1, 1] and r[0, 0] > r[2, 2]:
        s = math.sqrt(1.0 + r[0, 0] - r[1, 1] - r[2, 2]) * 2
        w = (r[2, 1] - r[1, 2]) / s
        x = 0.25 * s
        y = (r[0, 1] + r[1, 0]) / s
        z = (r[0, 2] + r[2, 0]) / s
    elif r[1, 1] > r[2, 2]:
        s = math.sqrt(1.0 + r[1, 1] - r[0, 0] - r[2, 2]) * 2
        w = (r[0, 2] - r[2, 0]) / s
        x = (r[0, 1] + r[1, 0]) / s
        y = 0.25 * s
        z = (r[1, 2] + r[2, 1]) / s
    else:
        s = math.sqrt(1.0 + r[2, 2] - r[0, 0] - r[1, 1]) * 2
        w = (r[1, 0] - r[0, 1]) / s
        x = (r[0, 2] + r[2, 0]) / s
        y = (r[1, 2] + r[2, 1]) / s
        z = 0.25 * s
    q = np.array([x, y, z, w], dtype=np.float64)
    return q / np.linalg.norm(q)


def invert_mat4(m):
    return np.linalg.inv(m).astype(np.float32)


# ---------------------------------------------------------------------------
# mesh primitives
# ---------------------------------------------------------------------------
def _rings_along(p0, p1, r0, r1, nu, nv, bulge=0.0):
    p0, p1 = np.asarray(p0, dtype=np.float64), np.asarray(p1, dtype=np.float64)
    axis = p1 - p0
    length = np.linalg.norm(axis) or 1e-6
    basis = look_basis(axis)
    x_ax, z_ax = basis[:3, 0], basis[:3, 2]
    verts, uvs, groups = [], [], []
    for i in range(nv + 1):
        t = i / nv
        r = r0 * (1 - t) + r1 * t
        if bulge:
            r *= 1.0 + bulge * math.sin(t * math.pi)
        c = p0 + axis * t
        for j in range(nu):
            a = (j / nu) * math.tau
            offset = x_ax * math.cos(a) * r + z_ax * math.sin(a) * r
            verts.append(c + offset)
            uvs.append((j / nu, t))
            groups.append(t)
    idx = []
    for i in range(nv):
        for j in range(nu):
            a = i * nu + j
            b = i * nu + (j + 1) % nu
            c = (i + 1) * nu + j
            d = (i + 1) * nu + (j + 1) % nu
            idx += [a, c, b, b, c, d]
    return np.array(verts), np.array(uvs), np.array(idx, dtype=np.uint32)


def capsule(p0, p1, r0, r1, nu=14, nv=8, bulge=0.0, cap=True):
    v, uv, idx = _rings_along(p0, p1, r0, r1, nu, nv, bulge)
    if not cap:
        return v, uv, idx
    extra_v, extra_uv, extra_i = [], [], []
    base = len(v)
    p0, p1 = np.asarray(p0, dtype=np.float64), np.asarray(p1, dtype=np.float64)
    axis = p1 - p0
    basis = look_basis(axis)
    x_ax, y_ax, z_ax = basis[:3, 0], basis[:3, 1], basis[:3, 2]
    # hemisphere at p0 (toward -Y bone) and p1
    for end, radius, sign in ((p0, r0, -1.0), (p1, r1, 1.0)):
        start = len(extra_v) + base
        rings = 4
        for i in range(1, rings + 1):
            t = i / rings
            phi = t * math.pi * 0.5
            rr = radius * math.cos(phi)
            yy = radius * math.sin(phi) * sign
            center = end + y_ax * yy
            for j in range(nu):
                a = (j / nu) * math.tau
                extra_v.append(center + x_ax * math.cos(a) * rr + z_ax * math.sin(a) * rr)
                extra_uv.append((j / nu, 0.0 if sign < 0 else 1.0))
        pole = end + y_ax * (radius * sign)
        extra_v.append(pole)
        extra_uv.append((0.5, 0.0 if sign < 0 else 1.0))
        pole_i = len(extra_v) + base - 1
        # stitch first hemi ring to capsule end ring
        # skip complex stitch — caps as separate fans from last ring of hemi
        for i in range(rings - 1):
            for j in range(nu):
                a = start + i * nu + j
                b = start + i * nu + (j + 1) % nu
                c = start + (i + 1) * nu + j
                d = start + (i + 1) * nu + (j + 1) % nu
                if sign < 0:
                    extra_i += [a, b, c, b, d, c]
                else:
                    extra_i += [a, c, b, b, c, d]
        last = start + (rings - 1) * nu
        for j in range(nu):
            a = last + j
            b = last + (j + 1) % nu
            if sign < 0:
                extra_i += [a, b, pole_i]
            else:
                extra_i += [a, pole_i, b]
    if extra_v:
        v = np.vstack([v, np.array(extra_v)])
        uv = np.vstack([uv, np.array(extra_uv)])
        idx = np.concatenate([idx, np.array(extra_i, dtype=np.uint32)])
    return v, uv, idx


def ellipsoid(center, rx, ry, rz, nu=18, nv=12):
    center = np.asarray(center, dtype=np.float64)
    verts, uvs, idx = [], [], []
    for i in range(nv + 1):
        v = i / nv
        phi = v * math.pi
        for j in range(nu + 1):
            u = j / nu
            th = u * math.tau
            x = rx * math.sin(phi) * math.cos(th)
            y = ry * math.cos(phi)
            z = rz * math.sin(phi) * math.sin(th)
            verts.append(center + v3(x, y, z))
            uvs.append((u, 1.0 - v))
    for i in range(nv):
        for j in range(nu):
            a = i * (nu + 1) + j
            b = a + 1
            c = a + (nu + 1)
            d = c + 1
            idx += [a, c, b, b, c, d]
    return np.array(verts), np.array(uvs), np.array(idx, dtype=np.uint32)


def disk(center, normal, radius, nu=20, inner=0.0):
    center = np.asarray(center, dtype=np.float64)
    basis = look_basis(normal)
    x_ax, z_ax = basis[:3, 0], basis[:3, 2]
    verts = [center]
    uvs = [(0.5, 0.5)]
    idx = []
    for j in range(nu):
        a = (j / nu) * math.tau
        p = center + x_ax * math.cos(a) * radius + z_ax * math.sin(a) * radius
        verts.append(p)
        uvs.append((0.5 + 0.5 * math.cos(a), 0.5 + 0.5 * math.sin(a)))
    for j in range(nu):
        idx += [0, 1 + j, 1 + (j + 1) % nu]
    return np.array(verts), np.array(uvs), np.array(idx, dtype=np.uint32)


def merge(parts):
    vs, uvs, ids = [], [], []
    base = 0
    for v, uv, idx in parts:
        vs.append(v)
        uvs.append(uv)
        ids.append(idx + base)
        base += len(v)
    return np.vstack(vs), np.vstack(uvs), np.concatenate(ids)


def compute_normals(v, idx):
    n = np.zeros_like(v, dtype=np.float64)
    for i in range(0, len(idx), 3):
        a, b, c = idx[i], idx[i + 1], idx[i + 2]
        fn = np.cross(v[b] - v[a], v[c] - v[a])
        n[a] += fn
        n[b] += fn
        n[c] += fn
    lens = np.linalg.norm(n, axis=1, keepdims=True)
    lens[lens < 1e-8] = 1
    return (n / lens).astype(np.float32)


def skin_weights(verts, bones, primary, radius=0.18):
    """bones: list of (name, head, tail). primary: names allowed."""
    name_i = {b[0]: i for i, b in enumerate(bones)}
    allowed = [name_i[n] for n in primary if n in name_i]
    joints = np.zeros((len(verts), 4), dtype=np.uint16)
    weights = np.zeros((len(verts), 4), dtype=np.float32)
    heads = np.array([b[1] for b in bones])
    tails = np.array([b[2] for b in bones])
    for vi, p in enumerate(verts):
        scored = []
        for bi in allowed:
            a, b = heads[bi], tails[bi]
            ab = b - a
            t = np.clip(np.dot(p - a, ab) / (np.dot(ab, ab) + 1e-8), 0, 1)
            closest = a + ab * t
            d = np.linalg.norm(p - closest)
            w = max(0.0, 1.0 - d / radius) ** 2
            if w > 1e-5:
                scored.append((w, bi))
        if not scored:
            # nearest allowed
            dists = []
            for bi in allowed:
                a, b = heads[bi], tails[bi]
                ab = b - a
                t = np.clip(np.dot(p - a, ab) / (np.dot(ab, ab) + 1e-8), 0, 1)
                dists.append((np.linalg.norm(p - (a + ab * t)), bi))
            dists.sort()
            scored = [(1.0, dists[0][1])]
        scored.sort(reverse=True)
        scored = scored[:4]
        s = sum(w for w, _ in scored) or 1.0
        for k, (w, bi) in enumerate(scored):
            joints[vi, k] = bi
            weights[vi, k] = w / s
    return joints, weights


# ---------------------------------------------------------------------------
# GLB writer
# ---------------------------------------------------------------------------
class GLB:
    def __init__(self):
        self.bin = bytearray()
        self.views = []
        self.accessors = []
        self.nodes = []
        self.meshes = []
        self.materials = []
        self.textures = []
        self.images = []
        self.samplers = [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}]
        self.skins = []
        self.anims = []
        self.scene_nodes = []

    def _pad(self, n=4):
        while len(self.bin) % n:
            self.bin.append(0)

    def add_buffer(self, data: bytes, target=None):
        self._pad(4)
        off = len(self.bin)
        self.bin.extend(data)
        self._pad(4)
        view = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target:
            view["target"] = target
        self.views.append(view)
        return len(self.views) - 1

    def add_accessor(self, array, typ, component, target=None, normalized=False):
        array = np.asarray(array)
        if component == 5126:
            blob = array.astype(np.float32).tobytes()
        elif component == 5123:
            blob = array.astype(np.uint16).tobytes()
        elif component == 5125:
            blob = array.astype(np.uint32).tobytes()
        else:
            blob = array.tobytes()
        stride = array.shape[-1] if array.ndim > 1 else 1
        # uint16 vec4 must be 8-byte aligned bufferView for joints
        if component == 5123:
            self._pad(4)
        view = self.add_buffer(blob, target)
        acc = {
            "bufferView": view,
            "componentType": component,
            "count": int(array.shape[0]),
            "type": typ,
        }
        if normalized:
            acc["normalized"] = True
        if typ in ("VEC3", "VEC4", "VEC2") and component == 5126:
            flat = array.reshape(array.shape[0], -1).astype(np.float32)
            acc["min"] = [float(x) for x in flat.min(axis=0)]
            acc["max"] = [float(x) for x in flat.max(axis=0)]
        if typ == "SCALAR" and component == 5126:
            acc["min"] = [float(array.min())]
            acc["max"] = [float(array.max())]
        if typ == "MAT4":
            pass
        self.accessors.append(acc)
        return len(self.accessors) - 1

    def add_png(self, img: Image.Image):
        import io

        buf = io.BytesIO()
        img.convert("RGBA").save(buf, format="PNG", optimize=True)
        data = buf.getvalue()
        view = self.add_buffer(data)
        self.images.append({"bufferView": view, "mimeType": "image/png"})
        self.textures.append({"sampler": 0, "source": len(self.images) - 1})
        return len(self.textures) - 1

    def add_material(self, name, color, rough=0.65, metal=0.0, tex=None, double=False):
        mat = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": color,
                "metallicFactor": metal,
                "roughnessFactor": rough,
            },
        }
        if tex is not None:
            mat["pbrMetallicRoughness"]["baseColorTexture"] = {"index": tex}
        if double:
            mat["doubleSided"] = True
        self.materials.append(mat)
        return len(self.materials) - 1

    def add_node(self, **kw):
        self.nodes.append(kw)
        return len(self.nodes) - 1

    def add_prim(self, v, n, uv, idx, joints, weights, material):
        a_pos = self.add_accessor(v.astype(np.float32), "VEC3", 5126, 34962)
        a_nrm = self.add_accessor(n.astype(np.float32), "VEC3", 5126, 34962)
        a_uv = self.add_accessor(uv.astype(np.float32), "VEC2", 5126, 34962)
        a_j = self.add_accessor(joints, "VEC4", 5123, 34962)
        a_w = self.add_accessor(weights.astype(np.float32), "VEC4", 5126, 34962)
        max_i = int(idx.max()) if len(idx) else 0
        if max_i > 65534:
            a_i = self.add_accessor(idx.astype(np.uint32), "SCALAR", 5125, 34963)
        else:
            a_i = self.add_accessor(idx.astype(np.uint16), "SCALAR", 5123, 34963)
        return {
            "attributes": {
                "POSITION": a_pos,
                "NORMAL": a_nrm,
                "TEXCOORD_0": a_uv,
                "JOINTS_0": a_j,
                "WEIGHTS_0": a_w,
            },
            "indices": a_i,
            "material": material,
        }

    def add_static_prim(self, v, n, uv, idx, material):
        a_pos = self.add_accessor(v.astype(np.float32), "VEC3", 5126, 34962)
        a_nrm = self.add_accessor(n.astype(np.float32), "VEC3", 5126, 34962)
        a_uv = self.add_accessor(uv.astype(np.float32), "VEC2", 5126, 34962)
        max_i = int(idx.max()) if len(idx) else 0
        if max_i > 65534:
            a_i = self.add_accessor(idx.astype(np.uint32), "SCALAR", 5125, 34963)
        else:
            a_i = self.add_accessor(idx.astype(np.uint16), "SCALAR", 5123, 34963)
        return {
            "attributes": {"POSITION": a_pos, "NORMAL": a_nrm, "TEXCOORD_0": a_uv},
            "indices": a_i,
            "material": material,
        }

    def add_rigid_mesh(self, name, v, uv, idx, material, parent, translation=(0.0, 0.0, 0.0)):
        nrm = compute_normals(v, idx)
        prim = self.add_static_prim(v, nrm, uv, idx, material)
        self.meshes.append({"name": name, "primitives": [prim]})
        node = self.add_node(name=name, mesh=len(self.meshes) - 1, translation=list(translation))
        self.nodes[parent].setdefault("children", []).append(node)
        return node

    def add_skinned_mesh(self, name, primitives, skin, translation=(0, 0, 0)):
        self.meshes.append({"name": name, "primitives": primitives})
        return self.add_node(
            name=name,
            mesh=len(self.meshes) - 1,
            skin=skin,
            translation=list(translation),
        )

    def dump(self, path: Path):
        gltf = {
            "asset": {"version": "2.0", "generator": "rybatskiy-mir-rig3d"},
            "scene": 0,
            "scenes": [{"nodes": self.scene_nodes}],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": self.materials,
            "accessors": self.accessors,
            "bufferViews": self.views,
            "buffers": [{"byteLength": len(self.bin)}],
            "samplers": self.samplers,
        }
        if self.skins:
            gltf["skins"] = self.skins
        if self.anims:
            gltf["animations"] = self.anims
        if self.images:
            gltf["images"] = self.images
            gltf["textures"] = self.textures
        js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
        while len(js) % 4:
            js += b" "
        blob = bytes(self.bin)
        while len(blob) % 4:
            blob += b"\x00"
        total = 12 + 8 + len(js) + 8 + len(blob)
        header = struct.pack("<4sII", b"glTF", 2, total)
        jchunk = struct.pack("<I4s", len(js), b"JSON") + js
        bchunk = struct.pack("<I4s", len(blob), b"BIN\x00") + blob
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(header + jchunk + bchunk)
        print(f"wrote {path}  {path.stat().st_size/1024:.1f} KB  nodes={len(self.nodes)} prims={sum(len(m['primitives']) for m in self.meshes)}")


# ---------------------------------------------------------------------------
# textures
# ---------------------------------------------------------------------------
def crop_face_albedo() -> Image.Image:
    im = Image.open(MASTER).convert("RGBA")
    w, h = im.size
    # head is near top-center of A-pose
    box = (int(w * 0.34), int(h * 0.01), int(w * 0.66), int(h * 0.28))
    face = im.crop(box).resize((768, 768), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (1024, 1024), (196, 168, 140, 255))
    # wrap-friendly: put face in equatorial front
    canvas.paste(face.resize((700, 780), Image.Resampling.LANCZOS), (162, 80), face.resize((700, 780)))
    # bleed horizontally for wrap
    arr = np.array(canvas)
    arr[:, :40] = arr[:, 40:80]
    arr[:, -40:] = arr[:, -80:-40]
    out = Image.fromarray(arr)
    out = out.filter(ImageFilter.GaussianBlur(0.4))
    return out


def jacket_albedo(color, size=1024) -> Image.Image:
    rng = np.random.default_rng(7)
    base = np.zeros((size, size, 4), dtype=np.uint8)
    base[:, :] = (*color, 255)
    noise = rng.normal(0, 7, (size, size, 3))
    img = np.clip(base[:, :, :3].astype(np.float32) + noise, 0, 255).astype(np.uint8)
    # faint weave
    yy, xx = np.mgrid[0:size, 0:size]
    weave = ((np.sin(xx * 0.35) + np.sin(yy * 0.35)) * 3).astype(np.int16)
    img = np.clip(img.astype(np.int16) + weave[..., None], 0, 255).astype(np.uint8)
    rgba = np.dstack([img, np.full((size, size), 255, np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def pike_albedo() -> Image.Image:
    src = Image.open(PIKE_SRC).convert("RGBA")
    a = np.array(src)
    rgb = a[:, :, :3].astype(np.int16)
    # grey studio bg
    bg = np.array([158, 158, 158])
    dist = np.linalg.norm(rgb - bg, axis=2)
    alpha = np.clip((dist - 18) * 6, 0, 255).astype(np.uint8)
    a[:, :, 3] = alpha
    # crop opaque
    ys, xs = np.where(alpha > 40)
    x0, x1 = max(0, xs.min() - 8), min(a.shape[1] - 1, xs.max() + 8)
    y0, y1 = max(0, ys.min() - 8), min(a.shape[0] - 1, ys.max() + 8)
    crop = Image.fromarray(a).crop((x0, y0, x1, y1))
    canvas = Image.new("RGBA", (2048, 1024), (62, 78, 48, 255))
    crop = crop.resize((1980, 920), Image.Resampling.LANCZOS)
    canvas.paste(crop, (34, 52), crop)
    return canvas


# ---------------------------------------------------------------------------
# skeleton
# ---------------------------------------------------------------------------
def humanoid_bones():
    """Bind T-pose, Y-up, facing +Z. Units meters. ~1.78m."""
    # name, parent, head, tail
    H = []

    def add(name, parent, head, tail):
        H.append((name, parent, np.asarray(head, dtype=np.float64), np.asarray(tail, dtype=np.float64)))

    add("Hips", None, (0, 0.96, 0.0), (0, 1.06, 0.0))
    add("Spine", "Hips", (0, 1.06, 0.02), (0, 1.20, 0.03))
    add("Spine1", "Spine", (0, 1.20, 0.03), (0, 1.34, 0.03))
    add("Chest", "Spine1", (0, 1.34, 0.03), (0, 1.50, 0.02))
    add("Neck", "Chest", (0, 1.50, 0.02), (0, 1.60, 0.03))
    add("Head", "Neck", (0, 1.60, 0.03), (0, 1.76, 0.04))
    # arms
    add("UpperArm_L", "Chest", (0.17, 1.46, 0.02), (0.46, 1.45, 0.01))
    add("LowerArm_L", "UpperArm_L", (0.46, 1.45, 0.01), (0.72, 1.44, 0.01))
    add("Hand_L", "LowerArm_L", (0.72, 1.44, 0.01), (0.82, 1.43, 0.02))
    add("UpperArm_R", "Chest", (-0.17, 1.46, 0.02), (-0.46, 1.45, 0.01))
    add("LowerArm_R", "UpperArm_R", (-0.46, 1.45, 0.01), (-0.72, 1.44, 0.01))
    add("Hand_R", "LowerArm_R", (-0.72, 1.44, 0.01), (-0.82, 1.43, 0.02))
    # legs
    add("UpperLeg_L", "Hips", (0.09, 0.96, 0.0), (0.10, 0.53, 0.01))
    add("LowerLeg_L", "UpperLeg_L", (0.10, 0.53, 0.01), (0.10, 0.12, 0.0))
    add("Foot_L", "LowerLeg_L", (0.10, 0.12, 0.0), (0.10, 0.04, 0.14))
    add("UpperLeg_R", "Hips", (-0.09, 0.96, 0.0), (-0.10, 0.53, 0.01))
    add("LowerLeg_R", "UpperLeg_R", (-0.10, 0.53, 0.01), (-0.10, 0.12, 0.0))
    add("Foot_R", "LowerLeg_R", (-0.10, 0.12, 0.0), (-0.10, 0.04, 0.14))
    # fingers — local continuation of hands
    fingers = [
        ("Thumb", 0.035, 0.04, 0.03),
        ("Index", 0.02, 0.045, 0.02),
        ("Middle", 0.0, 0.048, 0.02),
        ("Ring", -0.018, 0.044, 0.018),
        ("Pinky", -0.034, 0.038, 0.014),
    ]
    for side, sign in (("L", 1.0), ("R", -1.0)):
        hand = f"Hand_{side}"
        hx, hy, hz = (0.82 * sign, 1.43, 0.02)
        for name, zoff, length, thick in fingers:
            parent = hand
            px, py, pz = hx, hy, hz + zoff
            for k in range(1, 4):
                bname = f"{name}_{side}_{k}"
                tailx = px + 0.028 * sign * (1.0 if name != "Thumb" else 0.7)
                if name == "Thumb":
                    tailx = px + 0.022 * sign
                    taily = py + 0.01
                    tailz = pz + 0.018
                else:
                    taily = py
                    tailz = pz
                add(bname, parent, (px, py, pz), (tailx, taily, tailz))
                parent = bname
                px, py, pz = tailx, taily, tailz
    return H


def build_armature(glb: GLB, bones):
    """Create nodes with rest TRS in parent space. Return name->index, IBM list."""
    name_i = {}
    world = {}
    for name, parent, head, tail in bones:
        direction = tail - head
        basis = look_basis(direction)
        basis[:3, 3] = head
        world[name] = basis
        if parent is None:
            loc = head
            rot = quat_from_basis(basis)
            node = {
                "name": name,
                "translation": [float(loc[0]), float(loc[1]), float(loc[2])],
                "rotation": [float(x) for x in rot],
            }
        else:
            pw = world[parent]
            inv = np.linalg.inv(pw)
            local = inv @ basis
            loc = local[:3, 3]
            rot = quat_from_basis(local)
            node = {
                "name": name,
                "translation": [float(loc[0]), float(loc[1]), float(loc[2])],
                "rotation": [float(x) for x in rot],
            }
        idx = glb.add_node(**node)
        name_i[name] = idx
        if parent is not None:
            pnode = glb.nodes[name_i[parent]]
            pnode.setdefault("children", []).append(idx)
    # inverse bind: world of each bone
    ibm = []
    joint_nodes = []
    for name, parent, head, tail in bones:
        ibm.append(invert_mat4(world[name].astype(np.float32)))
        joint_nodes.append(name_i[name])
    ibm_arr = np.stack(ibm).astype(np.float32)
    # glTF wants column-major; numpy is row-major, exporter stores row as-is
    # three.js GLTFLoader expects column-major in the buffer.
    ibm_col = np.array([m.T for m in ibm_arr], dtype=np.float32)
    acc = glb.add_accessor(ibm_col.reshape(len(ibm), 16), "MAT4", 5126)
    skin = {"name": "Armature", "joints": joint_nodes, "inverseBindMatrices": acc, "skeleton": name_i[bones[0][0]]}
    glb.skins.append(skin)
    return name_i, 0, world


def add_animation(glb: GLB, name, times, channels, name_i):
    """channels: dict bone -> {rotation: [N,4], translation?: [N,3]}"""
    t_acc = glb.add_accessor(np.asarray(times, dtype=np.float32), "SCALAR", 5126)
    chans, samps = [], []
    for bone, tracks in channels.items():
        if bone not in name_i:
            continue
        node = name_i[bone]
        if "rotation" in tracks:
            rot = np.asarray(tracks["rotation"], dtype=np.float32)
            # normalize
            rot = rot / np.clip(np.linalg.norm(rot, axis=1, keepdims=True), 1e-6, None)
            a = glb.add_accessor(rot, "VEC4", 5126)
            samps.append({"input": t_acc, "output": a, "interpolation": "LINEAR"})
            chans.append({"sampler": len(samps) - 1, "target": {"node": node, "path": "rotation"}})
        if "translation" in tracks:
            tr = np.asarray(tracks["translation"], dtype=np.float32)
            a = glb.add_accessor(tr, "VEC3", 5126)
            samps.append({"input": t_acc, "output": a, "interpolation": "LINEAR"})
            chans.append({"sampler": len(samps) - 1, "target": {"node": node, "path": "translation"}})
    glb.anims.append({"name": name, "channels": chans, "samplers": samps})


def rest_rotations(bones, world):
    """Map name -> rest local quat (xyzw)."""
    out = {}
    by = {b[0]: b for b in bones}
    for name, parent, head, tail in bones:
        basis = world[name]
        if parent is None:
            out[name] = quat_from_basis(basis)
        else:
            local = np.linalg.inv(world[parent]) @ basis
            out[name] = quat_from_basis(local)
    return out


def pose_channels(times, rest, poses):
    """poses: list of dict bone->(rx,ry,rz) extra euler, same length as times."""
    bones = set()
    for p in poses:
        bones |= set(p.keys())
    ch = {}
    for b in bones:
        rots = []
        for p in poses:
            extra = p.get(b, (0, 0, 0))
            q = quat_mul(rest[b], quat_from_euler(*extra)) if b in rest else quat_from_euler(*extra)
            rots.append(q)
        ch[b] = {"rotation": rots}
    return ch


# ---------------------------------------------------------------------------
# fisherman mesh
# ---------------------------------------------------------------------------
def build_fisherman():
    glb = GLB()
    bones = humanoid_bones()
    name_i, skin, world = build_armature(glb, bones)
    glb.scene_nodes.append(name_i["Hips"])
    bone_list = [(b[0], b[2] if False else b[2], b[3] if False else b[3]) for b in [(*x,) for x in bones]]
    # fix unpack: bones are (name, parent, head, tail)
    bone_segs = [(n, h, t) for n, p, h, t in bones]

    face_tex = glb.add_png(crop_face_albedo())
    jacket_tex = glb.add_png(jacket_albedo((78, 92, 54)))
    pants_tex = glb.add_png(jacket_albedo((126, 118, 78)))
    boot_tex = glb.add_png(jacket_albedo((42, 40, 38)))
    cap_tex = glb.add_png(jacket_albedo((92, 62, 40)))

    mat_skin = glb.add_material("skin", [0.78, 0.64, 0.52, 1], rough=0.58, tex=face_tex)
    mat_jacket = glb.add_material("jacket", [1, 1, 1, 1], rough=0.72, tex=jacket_tex)
    mat_pants = glb.add_material("pants", [1, 1, 1, 1], rough=0.7, tex=pants_tex)
    mat_boots = glb.add_material("boots", [1, 1, 1, 1], rough=0.42, metal=0.05, tex=boot_tex)
    mat_cap = glb.add_material("cap", [1, 1, 1, 1], rough=0.68, tex=cap_tex)
    mat_glass = glb.add_material("glass", [0.22, 0.24, 0.26, 0.35], rough=0.12, metal=0.1, double=True)

    buckets: dict[int, list] = {}

    def part(mesh, primary, radius, material):
        v, uv, idx = mesh
        n = compute_normals(v, idx)
        j, w = skin_weights(v, bone_segs, primary, radius)
        buckets.setdefault(material, []).append((v, n, uv, idx, j, w))

    def flush():
        out = []
        for mat, items in buckets.items():
            vs, ns, uvs, ids, js, ws = [], [], [], [], [], []
            base = 0
            for v, n, uv, idx, j, w in items:
                vs.append(v)
                ns.append(n)
                uvs.append(uv)
                ids.append(idx + base)
                js.append(j)
                ws.append(w)
                base += len(v)
            out.append(
                glb.add_prim(np.vstack(vs), np.vstack(ns), np.vstack(uvs), np.concatenate(ids), np.vstack(js), np.vstack(ws), mat)
            )
        return out

    # head
    part(ellipsoid((0, 1.68, 0.04), 0.095, 0.115, 0.10, 22, 16), ["Head", "Neck"], 0.16, mat_skin)
    part(capsule((0, 1.50, 0.02), (0, 1.60, 0.03), 0.05, 0.045, 12, 5), ["Neck", "Head", "Chest"], 0.12, mat_skin)
    part(
        merge(
            [
                capsule((0, 1.08, 0.02), (0, 1.36, 0.04), 0.16, 0.20, 20, 8, bulge=0.12),
                capsule((0, 1.34, 0.04), (0, 1.50, 0.02), 0.20, 0.14, 20, 6, bulge=0.05),
                capsule((0.10, 1.44, 0.02), (0.22, 1.46, 0.02), 0.09, 0.07, 12, 4),
                capsule((-0.10, 1.44, 0.02), (-0.22, 1.46, 0.02), 0.09, 0.07, 12, 4),
            ]
        ),
        ["Hips", "Spine", "Spine1", "Chest", "UpperArm_L", "UpperArm_R"],
        0.22,
        mat_jacket,
    )
    part(ellipsoid((0, 0.98, 0.01), 0.16, 0.10, 0.12, 16, 10), ["Hips", "Spine", "UpperLeg_L", "UpperLeg_R"], 0.18, mat_pants)
    for s, u, l, h in (
        ("L", "UpperArm_L", "LowerArm_L", "Hand_L"),
        ("R", "UpperArm_R", "LowerArm_R", "Hand_R"),
    ):
        uh, ut = next(b[2:] for b in bones if b[0] == u)
        lh, lt = next(b[2:] for b in bones if b[0] == l)
        hh, ht = next(b[2:] for b in bones if b[0] == h)
        part(capsule(uh, ut, 0.065, 0.05, 14, 7, bulge=0.12), [u, l, "Chest"], 0.14, mat_jacket)
        part(capsule(lh, lt, 0.048, 0.04, 12, 6), [l, u, h], 0.12, mat_jacket)
        part(capsule(hh, ht, 0.038, 0.03, 10, 4), [h, l], 0.09, mat_skin)
        for name in ("Thumb", "Index", "Middle", "Ring", "Pinky"):
            for k in range(1, 4):
                bn = f"{name}_{s}_{k}"
                bh, bt = next(b[2:] for b in bones if b[0] == bn)
                r = 0.012 if name != "Thumb" else 0.014
                part(capsule(bh, bt, r, r * 0.8, 8, 3, cap=True), [bn, h], 0.05, mat_skin)
    for s, u, l, f in (
        ("L", "UpperLeg_L", "LowerLeg_L", "Foot_L"),
        ("R", "UpperLeg_R", "LowerLeg_R", "Foot_R"),
    ):
        uh, ut = next(b[2:] for b in bones if b[0] == u)
        lh, lt = next(b[2:] for b in bones if b[0] == l)
        fh, ft = next(b[2:] for b in bones if b[0] == f)
        part(capsule(uh, ut, 0.09, 0.065, 14, 7, bulge=0.1), [u, l, "Hips"], 0.16, mat_pants)
        part(capsule(lh, lt, 0.055, 0.045, 12, 6), [l, u, f], 0.13, mat_pants)
        part(capsule(fh, ft, 0.045, 0.04, 12, 5), [f, l], 0.12, mat_boots)
        heel = fh + v3(0, -0.02, -0.02)
        toe = ft + v3(0, -0.01, 0.02)
        part(capsule(heel, toe, 0.05, 0.042, 12, 4), [f], 0.12, mat_boots)
    part(ellipsoid((0, 1.76, 0.03), 0.10, 0.05, 0.11, 16, 8), ["Head"], 0.14, mat_cap)
    part(disk((0, 1.72, 0.12), v3(0, 1, 0.15), 0.09, 18), ["Head"], 0.14, mat_cap)
    part(
        merge(
            [
                capsule(v3(-0.038, 1.685, 0.125), v3(-0.01, 1.685, 0.13), 0.012, 0.012, 8, 3),
                capsule(v3(0.01, 1.685, 0.13), v3(0.038, 1.685, 0.125), 0.012, 0.012, 8, 3),
                capsule(v3(-0.01, 1.685, 0.128), v3(0.01, 1.685, 0.128), 0.006, 0.006, 6, 2),
            ]
        ),
        ["Head"],
        0.2,
        mat_glass,
    )

    mesh_node = glb.add_skinned_mesh("Fisherman", flush(), skin)
    glb.scene_nodes.append(mesh_node)

    gh = name_i["Head"]
    glass_node = glb.add_node(name="Glasses", translation=[0.0, 0.06, 0.09])
    glb.nodes[gh].setdefault("children", []).append(glass_node)

    rg = glb.add_node(name="RodGrip", translation=[-0.03, 0.02, 0.02])
    glb.nodes[name_i["Hand_R"]].setdefault("children", []).append(rg)

    rest = rest_rotations(bones, world)
    build_human_clips(glb, rest, name_i)

    path = OUT / "fisherman.glb"
    glb.dump(path)
    # stats
    tris = sum(len(p["indices"] and []) for p in [])  # skip
    return path


def e(x=0, y=0, z=0):
    return (x, y, z)


def build_human_clips(glb, rest, name_i):
    # extra eulers in radians on top of bind (T-pose)
    # bring arms down-forward for fishing
    # Right arm points -X; rotate around Z to bring down (positive Z rotates -X toward -Y)
    # R: rotZ +1.1 ≈ 63° down, rotY to bring forward
    down_r = {
        "UpperArm_R": e(0.15, 0.35, 1.15),
        "LowerArm_R": e(0.0, 0.0, 0.55),
        "Hand_R": e(0.2, 0.4, 0.15),
        "UpperArm_L": e(0.15, -0.25, -1.05),
        "LowerArm_L": e(0.0, 0.0, -0.7),
        "Hand_L": e(0.15, -0.2, -0.1),
        "Spine": e(0.10, 0.05, 0.0),
        "Spine1": e(0.06, 0.04, 0.0),
        "Chest": e(0.05, 0.06, 0.0),
        "Head": e(-0.12, 0.15, 0.0),
        "Neck": e(-0.05, 0.08, 0.0),
        "Hips": e(0.03, 0.04, 0.0),
        "UpperLeg_L": e(0.06, 0.0, -0.03),
        "UpperLeg_R": e(-0.04, 0.0, 0.03),
        "LowerLeg_L": e(0.08, 0.0, 0.0),
        "LowerLeg_R": e(0.04, 0.0, 0.0),
    }
    grip = {}
    for side, sign in (("L", 1), ("R", -1)):
        for name, curl in (("Thumb", 0.5), ("Index", 0.9), ("Middle", 1.0), ("Ring", 0.95), ("Pinky", 0.85)):
            for k in range(1, 4):
                grip[f"{name}_{side}_{k}"] = e(0.0, 0.0, curl * sign * (0.7 if k == 1 else 0.85))

    def combo(*ds):
        out = {}
        for d in ds:
            out.update(d)
        return out

    def breath(base, t):
        p = dict(base)
        s = math.sin(t * math.tau)
        p["Spine"] = e(base["Spine"][0] + 0.02 * s, base["Spine"][1], base["Spine"][2])
        p["Chest"] = e(base["Chest"][0] + 0.015 * s, base["Chest"][1], base["Chest"][2])
        p["Hips"] = e(base["Hips"][0], base["Hips"][1], 0.015 * s)
        return p

    idle = combo(down_r, grip)

    def loop(name, duration, pose_fn, n=5):
        times = [duration * i / (n - 1) for i in range(n)]
        poses = [pose_fn(t / duration if duration else 0) for t in times]
        add_animation(glb, name, times, pose_channels(times, rest, poses), name_i)

    loop("IDLE", 2.4, lambda u: breath(idle, u))
    ready = combo(idle, {"Chest": e(0.08, 0.08, 0.0), "UpperArm_R": e(0.1, 0.4, 1.05)})
    loop("READY", 2.0, lambda u: breath(ready, u))
    aim = combo(idle, {"Spine": e(0.14, 0.08, 0), "Chest": e(0.1, 0.12, 0), "Head": e(-0.18, 0.2, 0), "UpperArm_R": e(-0.05, 0.5, 0.95)})
    loop("AIM", 2.0, lambda u: breath(aim, u))
    wait = combo(idle, {"Spine": e(0.08, 0.02, 0), "Head": e(-0.2, 0.1, 0)})
    loop("WAIT", 2.2, lambda u: breath(wait, u))
    reel = combo(idle, {"UpperArm_L": e(0.2, -0.15, -0.85), "LowerArm_L": e(0.0, 0.0, -0.9), "Chest": e(0.08, 0.1, 0)})
    loop("REEL", 1.0, lambda u: combo(breath(reel, u), {"LowerArm_L": e(0.15 * math.sin(u * math.tau), 0, -0.9 + 0.12 * math.sin(u * math.tau))}))
    fight_l = combo(idle, {"Spine": e(-0.12, 0.05, 0), "Chest": e(-0.08, 0.08, 0), "Hips": e(-0.08, 0.06, 0), "UpperArm_R": e(-0.2, 0.4, 1.0), "UpperLeg_L": e(0.12, 0, -0.05), "UpperLeg_R": e(0.18, 0, 0.04)})
    loop("FIGHT_LIGHT", 1.6, lambda u: combo(breath(fight_l, u), {"Spine": e(-0.12 + 0.04 * math.sin(u * math.tau * 2), 0.05, 0.03 * math.sin(u * math.tau))}))
    fight_h = combo(idle, {"Spine": e(-0.22, 0.08, 0), "Chest": e(-0.16, 0.1, 0), "Hips": e(-0.14, 0.1, 0), "Head": e(0.1, 0.2, 0), "UpperArm_R": e(-0.3, 0.35, 0.9), "UpperLeg_L": e(0.22, 0, -0.08), "LowerLeg_L": e(0.25, 0, 0), "UpperLeg_R": e(0.28, 0, 0.06), "LowerLeg_R": e(0.2, 0, 0)})
    loop("FIGHT_HEAVY", 1.2, lambda u: combo(breath(fight_h, u), {"Hips": e(-0.14, 0.1 + 0.04 * math.sin(u * math.tau * 2), 0.05 * math.sin(u * math.tau * 1.5)), "Spine": e(-0.22 + 0.06 * math.sin(u * math.tau * 2.2), 0.08, 0)}))

    # one-shots
    def oneshot(name, keys):
        times = [k[0] for k in keys]
        poses = [combo(idle, k[1]) for k in keys]
        add_animation(glb, name, times, pose_channels(times, rest, poses), name_i)

    oneshot(
        "CAST_BACKSWING",
        [
            (0.0, {}),
            (0.18, {"Spine": e(-0.18, -0.42, 0.08), "Chest": e(-0.22, -0.5, 0.12), "Head": e(0.12, -0.35, 0), "UpperArm_R": e(-0.7, -0.5, 0.25), "LowerArm_R": e(0, 0, 0.22), "Hips": e(0.02, -0.22, 0), "UpperLeg_R": e(0.1, 0, 0.04)}),
            (0.48, {"Spine": e(-0.28, -0.62, 0.1), "Chest": e(-0.34, -0.72, 0.14), "UpperArm_R": e(-1.05, -0.7, 0.05), "LowerArm_R": e(0, 0, 0.08), "Hand_R": e(0.1, -0.2, 0.1), "Hips": e(0.06, -0.32, 0), "Head": e(0.15, -0.4, 0)}),
        ],
    )
    oneshot(
        "CAST_FORWARD",
        [
            (0.0, {"Spine": e(-0.28, -0.62, 0.1), "Chest": e(-0.34, -0.72, 0.14), "UpperArm_R": e(-1.05, -0.7, 0.05)}),
            (0.08, {"Spine": e(0.02, 0.0, 0), "Chest": e(0.08, 0.08, 0), "UpperArm_R": e(0.05, 0.45, 0.85), "LowerArm_R": e(0, 0, 0.45), "Hips": e(0.06, 0.12, 0)}),
            (0.2, {"Spine": e(0.28, 0.32, 0), "Chest": e(0.3, 0.42, 0), "UpperArm_R": e(0.4, 0.95, 1.2), "LowerArm_R": e(0, 0, 0.12), "Head": e(-0.22, 0.35, 0), "Hips": e(0.1, 0.26, 0)}),
        ],
    )
    oneshot(
        "CAST_FOLLOW",
        [
            (0.0, {"Spine": e(0.28, 0.32, 0), "Chest": e(0.3, 0.42, 0), "UpperArm_R": e(0.4, 0.95, 1.2)}),
            (0.25, {"Spine": e(0.12, 0.1, 0), "Chest": e(0.12, 0.12, 0), "UpperArm_R": e(0.15, 0.45, 1.1)}),
            (0.42, idle),
        ],
    )
    oneshot(
        "BITE_REACTION",
        [
            (0.0, {}),
            (0.12, {"Spine": e(-0.05, 0, 0), "Chest": e(-0.08, 0, 0), "Head": e(0.15, 0.1, 0), "UpperArm_R": e(-0.1, 0.3, 1.05)}),
            (0.35, idle),
        ],
    )
    oneshot(
        "HOOKSET",
        [
            (0.0, {}),
            (0.08, {"Spine": e(-0.25, 0.05, 0), "Chest": e(-0.3, 0.1, 0), "UpperArm_R": e(-0.55, 0.2, 0.7), "LowerArm_R": e(0, 0, 0.25), "Hips": e(-0.1, 0.08, 0), "Head": e(0.2, 0.15, 0)}),
            (0.22, combo(idle, {"Spine": e(-0.08, 0.05, 0), "UpperArm_R": e(-0.15, 0.35, 1.05)})),
        ],
    )
    oneshot(
        "LAND",
        [
            (0.0, fight_l),
            (0.4, {"Spine": e(0.25, 0.1, 0), "Chest": e(0.2, 0.15, 0), "Head": e(0.35, 0.2, 0), "UpperArm_R": e(0.4, 0.3, 0.8), "Hips": e(0.1, 0.1, 0), "UpperLeg_L": e(0.25, 0, 0), "LowerLeg_L": e(0.4, 0, 0)}),
            (0.8, combo(idle, {"Spine": e(0.18, 0.08, 0), "Head": e(0.3, 0.15, 0)})),
        ],
    )
    oneshot("RETURN_IDLE", [(0.0, combo(idle, {"Spine": e(0.18, 0.08, 0)})), (0.7, idle)])


# ---------------------------------------------------------------------------
# rod
# ---------------------------------------------------------------------------
def build_rod():
    glb = GLB()
    # chain of blank bones along +X from grip
    names = ["RodGrip"]
    nodes = []
    grip = glb.add_node(name="RodGrip", translation=[0, 0, 0])
    glb.scene_nodes.append(grip)
    parent = grip
    segs = 8
    blank_len = 1.95
    seg_l = blank_len / segs
    bone_defs = [("RodGrip", None, v3(0, 0, 0), v3(seg_l, 0, 0))]
    prev_tail = v3(seg_l, 0, 0)
    for i in range(segs):
        n = f"Blank_{i}"
        head = v3(i * seg_l, 0, 0)
        tail = v3((i + 1) * seg_l, 0, 0)
        bone_defs.append((n, "RodGrip" if i == 0 else f"Blank_{i-1}", head, tail))
        node = glb.add_node(name=n, translation=[seg_l if i else 0, 0, 0] if i else [0, 0, 0])
        if i == 0:
            # Blank_0 at origin of grip, along +X
            glb.nodes[node]["translation"] = [0, 0, 0]
        else:
            glb.nodes[node]["translation"] = [seg_l, 0, 0]
        glb.nodes[parent].setdefault("children", []).append(node)
        parent = node
    tip = glb.add_node(name="RodTip", translation=[seg_l, 0, 0])
    glb.nodes[parent].setdefault("children", []).append(tip)
    line = glb.add_node(name="LineStart", translation=[0.0, -0.002, 0.0])
    glb.nodes[tip].setdefault("children", []).append(line)
    support = glb.add_node(name="RodSupportTarget", translation=[0.55, 0.0, 0.0])
    glb.nodes[grip].setdefault("children", []).append(support)

    reel = glb.add_node(name="Reel", translation=[0.12, -0.045, 0.0])
    glb.nodes[grip].setdefault("children", []).append(reel)
    rotor = glb.add_node(name="ReelRotor", translation=[0.0, 0.0, 0.0])
    glb.nodes[reel].setdefault("children", []).append(rotor)
    handle = glb.add_node(name="ReelHandle", translation=[0.0, 0.0, 0.038])
    glb.nodes[reel].setdefault("children", []).append(handle)
    # Stationary IK target next to the reel — must NOT spin with the crank.
    handle_target = glb.add_node(name="ReelHandleTarget", translation=[0.0, 0.02, 0.04])
    glb.nodes[reel].setdefault("children", []).append(handle_target)

    # skin blank
    bones = []
    bones.append(("RodGrip", None, v3(0, 0, 0), v3(0.08, 0, 0)))
    for i in range(segs):
        bones.append((f"Blank_{i}", "RodGrip" if i == 0 else f"Blank_{i-1}", v3(i * seg_l, 0, 0), v3((i + 1) * seg_l, 0, 0)))
    # rebuild armature properly for rod — already have nodes. Build IBM from world.
    world = {}
    world["RodGrip"] = np.eye(4)
    for i in range(segs):
        m = np.eye(4, dtype=np.float64)
        m[0, 3] = i * seg_l
        world[f"Blank_{i}"] = m
    joint_names = ["RodGrip"] + [f"Blank_{i}" for i in range(segs)]
    # map existing nodes
    node_by_name = {n["name"]: i for i, n in enumerate(glb.nodes)}
    ibm = []
    joints = []
    for n in joint_names:
        ibm.append(invert_mat4(world[n].astype(np.float32)))
        joints.append(node_by_name[n])
    ibm_col = np.array([m.T for m in ibm], dtype=np.float32)
    acc = glb.add_accessor(ibm_col.reshape(len(ibm), 16), "MAT4", 5126)
    glb.skins.append({"name": "RodSkin", "joints": joints, "inverseBindMatrices": acc, "skeleton": node_by_name["RodGrip"]})

    bone_segs = [(n, world[n][:3, 3], world[n][:3, 3] + v3(seg_l, 0, 0)) for n in joint_names]
    bone_segs[0] = ("RodGrip", v3(0, 0, 0), v3(0.1, 0, 0))

    mat_blank = glb.add_material("blank", [0.12, 0.13, 0.14, 1], rough=0.32, metal=0.15)
    mat_cork = glb.add_material("cork", [0.62, 0.48, 0.32, 1], rough=0.78, metal=0.0)
    mat_seat = glb.add_material("seat", [0.18, 0.18, 0.2, 1], rough=0.35, metal=0.4)
    mat_reel = glb.add_material("reel", [0.16, 0.17, 0.18, 1], rough=0.28, metal=0.65)
    mat_gold = glb.add_material("gold", [0.72, 0.58, 0.28, 1], rough=0.3, metal=0.7)
    mat_guide = glb.add_material("guide", [0.55, 0.55, 0.56, 1], rough=0.25, metal=0.8)

    buckets: dict[int, list] = {}

    def part(mesh, primary, radius, material):
        v, uv, idx = mesh
        n = compute_normals(v, idx)
        j, w = skin_weights(v, bone_segs, primary, radius)
        buckets.setdefault(material, []).append((v, n, uv, idx, j, w))

    def flush():
        out = []
        for mat, items in buckets.items():
            vs, ns, uvs, ids, js, ws = [], [], [], [], [], []
            base = 0
            for v, n, uv, idx, j, w in items:
                vs.append(v)
                ns.append(n)
                uvs.append(uv)
                ids.append(idx + base)
                js.append(j)
                ws.append(w)
                base += len(v)
            out.append(
                glb.add_prim(np.vstack(vs), np.vstack(ns), np.vstack(uvs), np.concatenate(ids), np.vstack(js), np.vstack(ws), mat)
            )
        return out

    part(capsule(v3(-0.22, 0, 0), v3(0.08, 0, 0), 0.016, 0.014, 12, 6), ["RodGrip", "Blank_0"], 0.12, mat_cork)
    part(capsule(v3(0.08, 0, 0), v3(0.16, 0, 0), 0.013, 0.011, 10, 4), ["RodGrip", "Blank_0"], 0.1, mat_seat)
    for i in range(segs):
        t0, t1 = i / segs, (i + 1) / segs
        r0 = 0.009 * (1 - t0) + 0.0018 * t0
        r1 = 0.009 * (1 - t1) + 0.0018 * t1
        a, b = v3(i * seg_l, 0, 0), v3((i + 1) * seg_l, 0, 0)
        names_p = [f"Blank_{max(0,i-1)}", f"Blank_{i}", f"Blank_{min(segs-1,i+1)}"]
        part(capsule(a, b, r0, r1, 10, 4, cap=False), names_p, 0.2, mat_blank)
        if i in (1, 3, 5, 7):
            part(capsule(b + v3(0, 0.0, 0), b + v3(0.004, 0.012, 0), 0.004, 0.003, 8, 3), [f"Blank_{i}"], 0.15, mat_guide)

    part(ellipsoid(v3(0.12, -0.045, 0.0), 0.028, 0.032, 0.022, 14, 10), ["RodGrip"], 0.25, mat_reel)
    part(capsule(v3(0.12, -0.045, -0.012), v3(0.12, -0.045, 0.018), 0.016, 0.016, 12, 4), ["RodGrip"], 0.25, mat_gold)

    mesh_node = glb.add_skinned_mesh("Rod", flush(), 0)
    glb.scene_nodes.append(mesh_node)

    # Crank arm is a rigid child of ReelHandle so it actually spins in REEL.
    glb.add_rigid_mesh(
        "ReelHandleArm",
        *capsule(v3(0, 0, 0), v3(0, 0.055, 0), 0.004, 0.0035, 8, 3)[:3],
        mat_reel,
        handle,
    )
    glb.add_rigid_mesh(
        "ReelHandleKnob",
        *ellipsoid(v3(0, 0.058, 0), 0.01, 0.01, 0.01, 10, 8)[:3],
        mat_gold,
        handle,
    )

    path = OUT / "rod.glb"
    glb.dump(path)
    return path


# ---------------------------------------------------------------------------
# pike
# ---------------------------------------------------------------------------
def pike_bones():
    B = []
    xs = [0.0, 0.12, 0.28, 0.46, 0.64, 0.80, 0.94, 1.08]
    names = ["PikeRoot", "Spine_0", "Spine_1", "Spine_2", "Spine_3", "Spine_4", "Spine_5", "Tail"]
    for i, n in enumerate(names):
        parent = None if i == 0 else names[i - 1]
        head = v3(xs[i], 0, 0)
        tail = v3(xs[i + 1] if i + 1 < len(xs) else xs[i] + 0.12, 0, 0)
        B.append((n, parent, head, tail))
    B.append(("Jaw", "Spine_0", v3(0.02, -0.02, 0), v3(-0.10, -0.04, 0)))
    B.append(("Pectoral_L", "Spine_1", v3(0.22, -0.01, 0.04), v3(0.18, -0.06, 0.12)))
    B.append(("Pectoral_R", "Spine_1", v3(0.22, -0.01, -0.04), v3(0.18, -0.06, -0.12)))
    B.append(("Dorsal", "Spine_3", v3(0.58, 0.04, 0), v3(0.62, 0.14, 0)))
    B.append(("Anal", "Spine_4", v3(0.78, -0.03, 0), v3(0.82, -0.10, 0)))
    return B


def fish_body_mesh():
    # elongated ellipsoid along +X, snout at 0, tail at ~1.1
    nu, nv = 28, 16
    verts, uvs = [], []
    for i in range(nv + 1):
        v = i / nv  # 0 snout -> 1 tail
        # width profile of a pike
        if v < 0.12:
            rx = 0.035 + v * 0.4
            ry = 0.025 + v * 0.35
        elif v < 0.55:
            t = (v - 0.12) / 0.43
            rx = 0.083 + 0.01 * math.sin(t * math.pi)
            ry = 0.067
        else:
            t = (v - 0.55) / 0.45
            rx = 0.083 * (1 - t) + 0.008 * t
            ry = 0.067 * (1 - t) + 0.006 * t
        x = v * 1.12
        for j in range(nu + 1):
            u = j / nu
            th = u * math.tau
            y = ry * math.sin(th)
            z = rx * math.cos(th)
            verts.append(v3(x, y, z))
            uvs.append((v, u))
    idx = []
    for i in range(nv):
        for j in range(nu):
            a = i * (nu + 1) + j
            b = a + 1
            c = a + (nu + 1)
            d = c + 1
            idx += [a, c, b, b, c, d]
    # tail fin
    fin = []
    base = len(verts)
    for k, y in enumerate((-0.16, -0.05, 0.0, 0.05, 0.16)):
        verts.append(v3(1.08, 0.0, 0.0) if k == 2 else v3(1.20, y, 0.0))
        uvs.append((0.98, 0.5 + y))
    idx += [base, base + 1, base + 2, base, base + 2, base + 3, base, base + 3, base + 4]
    return np.array(verts), np.array(uvs), np.array(idx, dtype=np.uint32)


def build_pike():
    glb = GLB()
    bones = pike_bones()
    name_i, skin, world = build_armature(glb, bones)
    glb.scene_nodes.append(name_i["PikeRoot"])
    bone_segs = [(n, h, t) for n, p, h, t in bones]
    tex = glb.add_png(pike_albedo())
    mat = glb.add_material("pike", [1, 1, 1, 1], rough=0.45, metal=0.05, tex=tex, double=True)
    mat_fin = glb.add_material("fin", [0.45, 0.55, 0.38, 0.85], rough=0.5, double=True)

    prims = []
    v, uv, idx = fish_body_mesh()
    n = compute_normals(v, idx)
    prim = ["PikeRoot", "Spine_0", "Spine_1", "Spine_2", "Spine_3", "Spine_4", "Spine_5", "Tail", "Jaw"]
    j, w = skin_weights(v, bone_segs, prim, 0.22)
    prims.append(glb.add_prim(v, n, uv, idx, j, w, mat))
    # pectoral fins
    for name, sign in (("Pectoral_L", 1), ("Pectoral_R", -1)):
        fv, fu, fi = capsule(v3(0.22, -0.01, 0.03 * sign), v3(0.16, -0.05, 0.11 * sign), 0.018, 0.004, 8, 4)
        nrm = compute_normals(fv, fi)
        jj, ww = skin_weights(fv, bone_segs, [name, "Spine_1"], 0.12)
        prims.append(glb.add_prim(fv, nrm, fu, fi, jj, ww, mat_fin))
    dv, du, di = capsule(v3(0.55, 0.05, 0), v3(0.68, 0.16, 0), 0.03, 0.004, 8, 4)
    nrm = compute_normals(dv, di)
    jj, ww = skin_weights(dv, bone_segs, ["Dorsal", "Spine_3"], 0.12)
    prims.append(glb.add_prim(dv, nrm, du, di, jj, ww, mat_fin))

    mesh_node = glb.add_skinned_mesh("Pike", prims, skin)
    glb.scene_nodes.append(mesh_node)

    rest = rest_rotations(bones, world)
    spines = ["Spine_0", "Spine_1", "Spine_2", "Spine_3", "Spine_4", "Spine_5", "Tail"]

    def wave(amp, freq, phase, u, yaw=0.0):
        p = {"PikeRoot": e(0, yaw, 0.04 * amp * math.sin(u * math.tau))}
        for i, n in enumerate(spines):
            a = amp * math.sin(u * math.tau * freq + i * phase)
            p[n] = e(0, a, 0)
        p["Pectoral_L"] = e(0.3 * math.sin(u * math.tau * 2), 0, 0)
        p["Pectoral_R"] = e(-0.3 * math.sin(u * math.tau * 2 + 0.4), 0, 0)
        p["Dorsal"] = e(0, 0.15 * math.sin(u * math.tau), 0)
        p["Jaw"] = e(0.08 + 0.05 * math.sin(u * math.tau * 3), 0, 0)
        return p

    def loop(name, dur, fn, n=8):
        times = [dur * i / (n - 1) for i in range(n)]
        poses = [fn(i / (n - 1)) for i in range(n)]
        add_animation(glb, name, times, pose_channels(times, rest, poses), name_i)

    loop("SWIM_IDLE", 1.6, lambda u: wave(0.12, 1.0, 0.55, u))
    loop("SWIM_FAST", 0.7, lambda u: wave(0.22, 1.0, 0.7, u))
    loop("TURN_LEFT", 1.2, lambda u: wave(0.14, 1.0, 0.5, u, yaw=0.4 * math.sin(u * math.pi)))
    loop("TURN_RIGHT", 1.2, lambda u: wave(0.14, 1.0, 0.5, u, yaw=-0.4 * math.sin(u * math.pi)))
    loop("STRUGGLE_LIGHT", 0.55, lambda u: wave(0.28, 1.4, 0.8, u))
    loop("STRUGGLE_HEAVY", 0.35, lambda u: wave(0.42, 1.6, 0.9, u))
    loop("SURFACE", 1.4, lambda u: combo_fish(wave(0.1, 0.8, 0.4, u), {"PikeRoot": e(-0.35 * math.sin(u * math.pi), 0.2 * math.sin(u * math.tau), 0)}))
    loop("LANDED", 2.0, lambda u: wave(0.05, 0.5, 0.3, u))

    path = OUT / "pike.glb"
    glb.dump(path)
    return path


def combo_fish(a, b):
    d = dict(a)
    d.update(b)
    return d


def main():
    ART.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    crop_face_albedo().save(ART / "face.png")
    pike_albedo().save(ART / "pike.png")
    build_fisherman()
    build_rod()
    build_pike()
    print("done")


if __name__ == "__main__":
    main()
