#!/usr/bin/env python3
"""Replace a single animation clip in dest GLB with the clip from src GLB.

Mesh, skins, images, and other animations in dest are left untouched.
"""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path


def read_glb(path: Path):
    data = path.read_bytes()
    off = 12
    gltf = None
    blob = b""
    while off < len(data):
        clen, ctype = struct.unpack_from("<I4s", data, off)
        off += 8
        chunk = data[off : off + clen]
        off += clen
        if ctype[:4] == b"JSON":
            gltf = json.loads(chunk)
        elif ctype[:4] == b"BIN\x00":
            blob = chunk
    return gltf, bytearray(blob)


def write_glb(path: Path, gltf: dict, blob: bytes):
    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    js += b" " * ((4 - len(js) % 4) % 4)
    blob = bytes(blob)
    pad = (4 - len(blob) % 4) % 4
    blob += b"\x00" * pad
    total = 12 + 8 + len(js) + 8 + len(blob)
    out = bytearray()
    out += struct.pack("<4sII", b"glTF", 2, total)
    out += struct.pack("<I4s", len(js), b"JSON")
    out += js
    out += struct.pack("<I4s", len(blob), b"BIN\x00")
    out += blob
    path.write_bytes(out)
    print("wrote", path, len(out), "anims", [a.get("name") for a in gltf.get("animations", [])])


def view_bytes(gltf, blob, index):
    v = gltf["bufferViews"][index]
    start = v.get("byteOffset", 0)
    return bytes(blob[start : start + v["byteLength"]])


def append_view(gltf, blob: bytearray, data: bytes, target=None):
    pad = (4 - len(blob) % 4) % 4
    blob.extend(b"\x00" * pad)
    off = len(blob)
    blob.extend(data)
    view = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
    if target is not None:
        view["target"] = target
    gltf["bufferViews"].append(view)
    return len(gltf["bufferViews"]) - 1


def stem(name: str) -> str:
    n = name.replace("_Bip01", "").replace("_Armature", "")
    if "|" in n:
        n = n.split("|")[0]
    return n.strip()


def main():
    dest_path = Path(sys.argv[1])
    src_path = Path(sys.argv[2])
    want = sys.argv[3] if len(sys.argv) > 3 else "WALK"

    dest, dest_bin = read_glb(dest_path)
    src, src_bin = read_glb(src_path)

    dest_nodes = {n.get("name"): i for i, n in enumerate(dest["nodes"]) if n.get("name")}
    src_nodes = src["nodes"]
    print("dest nodes", len(dest_nodes), "src anims", [a.get("name") for a in src.get("animations", [])])

    acc_remap = {}

    def copy_accessor(ai: int) -> int:
        if ai in acc_remap:
            return acc_remap[ai]
        acc = dict(src["accessors"][ai])
        view_i = acc["bufferView"]
        raw = view_bytes(src, src_bin, view_i)
        new_view = append_view(dest, dest_bin, raw, src["bufferViews"][view_i].get("target"))
        acc["bufferView"] = new_view
        dest["accessors"].append(acc)
        ni = len(dest["accessors"]) - 1
        acc_remap[ai] = ni
        return ni

    src_anim = None
    for anim in src.get("animations", []):
        if stem(anim.get("name") or "") == want:
            src_anim = anim
            break
    if src_anim is None:
        raise SystemExit(f"src missing clip {want}")

    samplers = []
    for s in src_anim.get("samplers", []):
        samplers.append(
            {
                "input": copy_accessor(s["input"]),
                "output": copy_accessor(s["output"]),
                "interpolation": s.get("interpolation", "LINEAR"),
            }
        )
    channels = []
    missing = 0
    for ch in src_anim.get("channels", []):
        nname = src_nodes[ch["target"]["node"]].get("name")
        if nname not in dest_nodes:
            missing += 1
            continue
        channels.append(
            {
                "sampler": ch["sampler"],
                "target": {"node": dest_nodes[nname], "path": ch["target"]["path"]},
            }
        )
    print("channels", len(channels), "missing nodes", missing)

    replaced = False
    for i, anim in enumerate(dest.get("animations", [])):
        if stem(anim.get("name") or "") == want:
            dest["animations"][i] = {"name": want, "samplers": samplers, "channels": channels}
            replaced = True
            print("replaced", anim.get("name"), "->", want)
            break
    if not replaced:
        dest.setdefault("animations", []).append({"name": want, "samplers": samplers, "channels": channels})
        print("appended", want)

    dest["buffers"][0]["byteLength"] = len(dest_bin)
    write_glb(dest_path, dest, dest_bin)


if __name__ == "__main__":
    main()
