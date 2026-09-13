#!/usr/bin/env python3
"""Lake stick float — Y-up, waterline at origin.

FloatAttach  at antenna tip (line end)
FloatWaterline at y=0
FloatBottom  at keel tip
"""
from __future__ import annotations

import json
import math
import struct
from pathlib import Path

import numpy as np

OUT = Path("/workspace/public/models/production/float.glb")


def v3(x, y, z):
    return np.array([x, y, z], dtype=np.float64)


def cylinder(r, y0, y1, nu=16):
    verts, uvs, idx = [], [], []
    for i in range(2):
        y = y0 if i == 0 else y1
        for j in range(nu + 1):
            u = j / nu
            a = u * math.tau
            verts.append(v3(r * math.cos(a), y, r * math.sin(a)))
            uvs.append((u, i))
    for j in range(nu):
        a, b = j, j + 1
        c, d = nu + 1 + j, nu + 1 + j + 1
        idx += [a, c, b, b, c, d]
    # caps
    top_c = len(verts)
    verts.append(v3(0, y1, 0))
    uvs.append((0.5, 1))
    bot_c = len(verts)
    verts.append(v3(0, y0, 0))
    uvs.append((0.5, 0))
    for j in range(nu):
        idx += [top_c, nu + 1 + j + 1, nu + 1 + j]
        idx += [bot_c, j, j + 1]
    return np.array(verts), np.array(uvs), np.array(idx, dtype=np.uint32)


def sphere(center, r, nu=14, nv=10):
    cx, cy, cz = center
    verts, uvs, idx = [], [], []
    for i in range(nv + 1):
        v = i / nv
        phi = v * math.pi
        for j in range(nu + 1):
            u = j / nu
            th = u * math.tau
            verts.append(
                v3(
                    cx + r * math.sin(phi) * math.cos(th),
                    cy + r * math.cos(phi),
                    cz + r * math.sin(phi) * math.sin(th),
                )
            )
            uvs.append((u, 1 - v))
    for i in range(nv):
        for j in range(nu):
            a = i * (nu + 1) + j
            b = a + 1
            c = a + (nu + 1)
            d = c + 1
            idx += [a, c, b, b, c, d]
    return np.array(verts), np.array(uvs), np.array(idx, dtype=np.uint32)


def ellipsoid(center, rx, ry, rz, nu=16, nv=12):
    cx, cy, cz = center
    verts, uvs, idx = [], [], []
    for i in range(nv + 1):
        v = i / nv
        phi = v * math.pi
        for j in range(nu + 1):
            u = j / nu
            th = u * math.tau
            verts.append(
                v3(
                    cx + rx * math.sin(phi) * math.cos(th),
                    cy + ry * math.cos(phi),
                    cz + rz * math.sin(phi) * math.sin(th),
                )
            )
            uvs.append((u, 1 - v))
    for i in range(nv):
        for j in range(nu):
            a = i * (nu + 1) + j
            b = a + 1
            c = a + (nu + 1)
            d = c + 1
            idx += [a, c, b, b, c, d]
    return np.array(verts), np.array(uvs), np.array(idx, dtype=np.uint32)


def normals(v, idx):
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


class Glb:
    def __init__(self):
        self.bin = bytearray()
        self.views, self.accessors, self.nodes, self.meshes, self.materials = [], [], [], [], []
        self.scene_nodes = []

    def _pad(self):
        while len(self.bin) % 4:
            self.bin.append(0)

    def add_buffer(self, data, target=None):
        self._pad()
        off = len(self.bin)
        self.bin.extend(data)
        self._pad()
        view = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target:
            view["target"] = target
        self.views.append(view)
        return len(self.views) - 1

    def add_accessor(self, array, typ, component, target=None):
        array = np.asarray(array)
        blob = array.astype(np.float32).tobytes() if component == 5126 else array.astype(np.uint16).tobytes()
        view = self.add_buffer(blob, target)
        acc = {"bufferView": view, "componentType": component, "count": int(array.shape[0]), "type": typ}
        if typ == "VEC3" and component == 5126:
            flat = array.reshape(array.shape[0], -1).astype(np.float32)
            acc["min"] = [float(x) for x in flat.min(axis=0)]
            acc["max"] = [float(x) for x in flat.max(axis=0)]
        self.accessors.append(acc)
        return len(self.accessors) - 1

    def add_material(self, name, color, rough=0.5, metal=0.0):
        self.materials.append(
            {
                "name": name,
                "pbrMetallicRoughness": {
                    "baseColorFactor": color,
                    "metallicFactor": metal,
                    "roughnessFactor": rough,
                },
            }
        )
        return len(self.materials) - 1

    def add_node(self, **kw):
        self.nodes.append(kw)
        return len(self.nodes) - 1

    def add_mesh(self, name, v, uv, idx, material, parent):
        nrm = normals(v, idx)
        a_pos = self.add_accessor(v.astype(np.float32), "VEC3", 5126, 34962)
        a_n = self.add_accessor(nrm, "VEC3", 5126, 34962)
        a_uv = self.add_accessor(uv.astype(np.float32), "VEC2", 5126, 34962)
        a_i = self.add_accessor(idx.astype(np.uint16), "SCALAR", 5123, 34963)
        prim = {
            "attributes": {"POSITION": a_pos, "NORMAL": a_n, "TEXCOORD_0": a_uv},
            "indices": a_i,
            "material": material,
        }
        self.meshes.append({"name": name, "primitives": [prim]})
        node = self.add_node(name=name, mesh=len(self.meshes) - 1)
        self.nodes[parent].setdefault("children", []).append(node)
        return node

    def dump(self, path: Path):
        gltf = {
            "asset": {"version": "2.0", "generator": "rybatskiy-mir-float"},
            "scene": 0,
            "scenes": [{"nodes": self.scene_nodes}],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": self.materials,
            "accessors": self.accessors,
            "bufferViews": self.views,
            "buffers": [{"byteLength": len(self.bin)}],
        }
        js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
        while len(js) % 4:
            js += b" "
        blob = bytes(self.bin)
        while len(blob) % 4:
            blob += b"\x00"
        total = 12 + 8 + len(js) + 8 + len(blob)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(
            struct.pack("<4sII", b"glTF", 2, total)
            + struct.pack("<I4s", len(js), b"JSON")
            + js
            + struct.pack("<I4s", len(blob), b"BIN\x00")
            + blob
        )
        print(f"wrote {path}  {path.stat().st_size / 1024:.1f} KB")


def main():
    g = Glb()
    root = g.add_node(name="FloatRoot")
    g.scene_nodes = [root]

    m_ant = g.add_material("Antenna", [0.86, 0.22, 0.10, 1], rough=0.42, metal=0.02)
    m_tip = g.add_material("AntennaTip", [0.92, 0.28, 0.12, 1], rough=0.35, metal=0.05)
    m_body = g.add_material("Body", [0.78, 0.74, 0.62, 1], rough=0.48, metal=0.0)
    m_band = g.add_material("SightBand", [0.88, 0.18, 0.10, 1], rough=0.4, metal=0.0)
    m_keel = g.add_material("Keel", [0.14, 0.14, 0.15, 1], rough=0.38, metal=0.45)

    # Waterline at y=0. Body mostly submerged. Antenna above.
    g.add_mesh("Antenna", *cylinder(0.00135, 0.034, 0.108, 12), m_ant, root)
    g.add_mesh("AntennaTip", *sphere((0, 0.112, 0), 0.0024, 12, 8), m_tip, root)
    g.add_mesh("SightBand", *cylinder(0.0076, 0.016, 0.036, 16), m_band, root)
    g.add_mesh("Body", *ellipsoid((0, 0.004, 0), 0.0082, 0.022, 0.0082, 16, 12), m_body, root)
    g.add_mesh("Keel", *cylinder(0.0015, -0.048, -0.012, 10), m_keel, root)
    g.add_mesh("KeelWeight", *sphere((0, -0.052, 0), 0.0032, 10, 8), m_keel, root)

    attach = g.add_node(name="FloatAttach", translation=[0, 0.114, 0])
    water = g.add_node(name="FloatWaterline", translation=[0, 0, 0])
    bottom = g.add_node(name="FloatBottom", translation=[0, -0.056, 0])
    g.nodes[root]["children"] = g.nodes[root].get("children", []) + [attach, water, bottom]

    g.dump(OUT)


if __name__ == "__main__":
    main()
